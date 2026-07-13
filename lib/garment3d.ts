import * as THREE from "three";
import type { CatalogItem } from "./catalog";

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
        hipsY: [0.95, 9],
        roughness: /blazer/.test(item.id) ? 0.7 : 0.9,
      };
    case "bottom":
      return {
        mask: mask(4, 5, 6),
        inflate: 0.007,
        hipsY: [0, 1.06],
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

function createGarmentMaterial(color: string, spec: GarmentSpec) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: spec.roughness,
    metalness: 0,
  });
  if (process.env.NEXT_PUBLIC_GARMENT_PLAIN) return mat;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uMask = { value: spec.mask };
    shader.uniforms.uHipsY = { value: new THREE.Vector2(...spec.hipsY) };
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
        uniform int uMask;
        uniform vec2 uHipsY;`
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `{
          int r = int(vRegion + 0.5);
          if (((uMask >> r) & 1) == 0) discard;
          if (r == 4 && (vGy < uHipsY.x || vGy > uHipsY.y)) discard;
        }
        #include <clipping_planes_fragment>`
      );
  };
  return mat;
}

/** Clones the body mesh as a skinned garment layer. Caller owns removal. */
export function createGarmentMesh(
  body: THREE.SkinnedMesh,
  item: CatalogItem
): THREE.SkinnedMesh | null {
  const spec = garmentSpec(item);
  if (!spec) return null;
  ensureRegionAttribute(body);
  const m = body.clone();
  m.name = `garment-${item.id}`;
  m.geometry = inflatedGeometry(body.geometry, spec.inflate);
  m.material = createGarmentMaterial(item.color, spec);
  m.frustumCulled = false;
  m.castShadow = false; // the body underneath already casts
  return m;
}
