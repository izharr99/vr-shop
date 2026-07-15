import * as THREE from "three";
import type { CatalogItem } from "./catalog";
import type { SizeDelta } from "./store";

/**
 * Real-fit garments: each garment is a clone of the avatar's own skinned
 * body mesh, inflated slightly along the normals (fabric over skin) and
 * clipped in the shader to the body regions the garment covers. Because it
 * shares the skeleton and skin weights, it deforms with animation and with
 * the build morph exactly like the body underneath.
 */

// Region codes written into the aRegion vertex attribute
// 0 other (head/hands/feet)  1 torso  2 upper arm  3 forearm
// 4 hips  5 thigh  6 lower leg
export function regionForBoneName(name: string): number {
  if (/ForeArm/.test(name)) return 3;
  if (/Shoulder|Arm/.test(name)) return 2;
  if (/Spine/.test(name)) return 1;
  if (/UpLeg/.test(name)) return 5;
  if (/Leg/.test(name)) return 6;
  if (/Hips/.test(name)) return 4;
  return 0;
}

const mask = (...regions: number[]) =>
  regions.reduce((m, r) => m | (1 << r), 0);

interface GarmentSpec {
  mask: number;
  inflate: number;
  /** Y band applied to hips-region vertices (waistline/hem control) */
  hipsY: [number, number];
  roughness: number;
}

export function garmentSpec(item: CatalogItem): GarmentSpec | null {
  const longSleeve = /hoodie|blazer|shirt/.test(item.id);
  switch (item.slot) {
    case "top":
      return {
        mask: longSleeve ? mask(1, 2, 3, 4) : mask(1, 2, 4),
        // geometry units are meters (the rig's 0.01 world scale is
        // cancelled by the bind matrices)
        inflate: /hoodie|blazer/.test(item.id) ? 0.016 : 0.009,
        hipsY: [0.88, 9],
        roughness: /blazer/.test(item.id) ? 0.7 : 0.9,
      };
    case "bottom":
      return {
        mask: mask(4, 5, 6),
        inflate: 0.007,
        hipsY: [0, 1.12],
        roughness: 0.9,
      };
    default:
      return null; // hats are attached to the head bone instead
  }
}

/** Computes the dominant-bone region per vertex once per geometry. */
export function ensureRegionAttribute(mesh: THREE.SkinnedMesh) {
  const geo = mesh.geometry;
  if (geo.getAttribute("aRegion")) return;
  const si = geo.getAttribute("skinIndex");
  const sw = geo.getAttribute("skinWeight");
  const bones = mesh.skeleton.bones;
  const regions = new Float32Array(si.count);
  for (let i = 0; i < si.count; i++) {
    let best = 0;
    let bestW = -1;
    for (let c = 0; c < 4; c++) {
      const w = sw.getComponent(i, c);
      if (w > bestW) {
        bestW = w;
        best = si.getComponent(i, c);
      }
    }
    regions[i] = regionForBoneName(bones[best]?.name ?? "");
  }
  geo.setAttribute("aRegion", new THREE.BufferAttribute(regions, 1));
}

/** Bind-pose positions pushed out along the (unit) bind normals — fabric
 * thickness baked into the geometry so the GPU skinning path is untouched. */
const inflatedCache = new Map<string, THREE.BufferGeometry>();
function inflatedGeometry(base: THREE.BufferGeometry, inflate: number) {
  const key = `${base.uuid}:${inflate}`;
  const hit = inflatedCache.get(key);
  if (hit) return hit;
  const geo = base.clone();
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const nrm = base.getAttribute("normal") as THREE.BufferAttribute;
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    n.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i)).normalize();
    pos.setXYZ(
      i,
      pos.getX(i) + n.x * inflate,
      pos.getY(i) + n.y * inflate,
      pos.getZ(i) + n.z * inflate
    );
  }
  pos.needsUpdate = true;
  inflatedCache.set(key, geo);
  return geo;
}

/** Tiny generated fabric-weave bump/roughness texture — no assets needed. */
let fabricTex: THREE.CanvasTexture | null = null;
export function fabricTexture() {
  if (fabricTex) return fabricTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 128, 128);
  const img = ctx.getImageData(0, 0, 128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      // weave: alternating warp/weft ridges + gentle noise
      const weave =
        (x % 4 < 2 ? 10 : -10) + (y % 4 < 2 ? 8 : -8) + (Math.random() - 0.5) * 26;
      const v = 128 + weave;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
  fabricTex = new THREE.CanvasTexture(c);
  fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping;
  fabricTex.repeat.set(24, 24);
  return fabricTex;
}

/** Region-mask material hook shared by garments and the covered body.
 * NOTE: an int bitmask + dynamic shift (`(uMask >> r) & 1`) miscompiles on
 * ANGLE/Metal (region 3 discarded despite being in the mask), so the mask
 * ships as a float array indexed by region instead. */
function installRegionClip(
  mat: THREE.MeshStandardMaterial,
  maskBits: number,
  hipsY: [number, number],
  invert: boolean
) {
  mat.onBeforeCompile = (shader) => {
    mat.userData.shader = shader;
    shader.uniforms.uMaskArr = {
      value: Array.from({ length: 7 }, (_, r) => ((maskBits >> r) & 1 ? 1 : 0)),
    };
    shader.uniforms.uHipsY = { value: new THREE.Vector2(...hipsY) };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aRegion;
        varying float vRegion;
        varying float vGy;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vRegion = aRegion;
        vGy = transformed.y;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vRegion;
        varying float vGy;
        uniform float uMaskArr[7];
        uniform vec2 uHipsY;`
      )
      .replace(
        "#include <clipping_planes_fragment>",
        (invert
          ? `{
          int r = clamp(int(vRegion + 0.5), 0, 6);
          bool inBand = vGy >= uHipsY.x && vGy <= uHipsY.y;
          if (uMaskArr[r] > 0.5 && (r != 4 || inBand)) discard;
        }`
          : `{
          int r = clamp(int(vRegion + 0.5), 0, 6);
          if (uMaskArr[r] < 0.5) discard;
          if (r == 4 && (vGy < uHipsY.x || vGy > uHipsY.y)) discard;
        }`) + "\n        #include <clipping_planes_fragment>"
      );
  };
}

function createGarmentMaterial(item: CatalogItem, spec: GarmentSpec, size: SizeDelta) {
  const color = new THREE.Color(item.color);
  // one size down: fabric visibly stretched (lighter, smoother)
  if (size < 0) color.offsetHSL(0, -0.06, 0.07);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: size < 0 ? Math.max(0.4, spec.roughness - 0.25) : spec.roughness,
    metalness: 0,
    bumpMap: fabricTexture(),
    bumpScale: /blazer|slacks|chinos/.test(item.id) ? 0.15 : 0.35,
    roughnessMap: fabricTexture(),
  });
  if (process.env.NEXT_PUBLIC_GARMENT_PLAIN) return mat;
  // loose fit: hem hangs a little lower on tops
  const hipsY: [number, number] =
    item.slot === "top"
      ? [spec.hipsY[0] - (size > 0 ? 0.06 : 0), spec.hipsY[1]]
      : spec.hipsY;
  installRegionClip(mat, spec.mask, hipsY, false);
  return mat;
}

/** Clones the body mesh as a skinned garment layer. Caller owns removal.
 * `size` is relative to the shopper's recommended size (-1 tight, +1 loose). */
export function createGarmentMesh(
  body: THREE.SkinnedMesh,
  item: CatalogItem,
  size: SizeDelta = 0
): THREE.SkinnedMesh | null {
  const spec = garmentSpec(item);
  if (!spec) return null;
  ensureRegionAttribute(body);
  const m = body.clone();
  m.name = `garment-${item.id}`;
  // tight hugs the body, loose adds air — inflate is the fit itself
  const inflate = spec.inflate * (size === 0 ? 1 : size < 0 ? 0.35 : 2.1);
  m.geometry = inflatedGeometry(body.geometry, inflate);
  m.material = createGarmentMaterial(item, spec, size);
  m.frustumCulled = false;
  m.castShadow = false; // the body underneath already casts
  return m;
}

/** Swaps the joints-body material for one that hides regions covered by
 * clothing (the mechanical joint balls otherwise poke through garments).
 * Returns an updater to call whenever the covered-region mask changes. */
export function installCoverHider(jointsBody: THREE.SkinnedMesh) {
  ensureRegionAttribute(jointsBody);
  const src = jointsBody.material as THREE.MeshStandardMaterial;
  const mat = src.clone();
  installRegionClip(mat, 0, [-100, 100], true);
  jointsBody.material = mat;
  return (coveredMask: number) => {
    const shader = mat.userData.shader as
      | { uniforms: { uMaskArr: { value: number[] } } }
      | undefined;
    if (shader) {
      shader.uniforms.uMaskArr.value = Array.from({ length: 7 }, (_, r) =>
        (coveredMask >> r) & 1 ? 1 : 0
      );
    } else {
      // material not compiled yet — bake the mask into the next compile
      installRegionClip(mat, coveredMask, [-100, 100], true);
      mat.needsUpdate = true;
    }
  };
}

/** Union of body regions covered by the worn items. */
export function coveredRegions(items: CatalogItem[]) {
  return items.reduce((m, it) => m | (garmentSpec(it)?.mask ?? 0), 0);
}
