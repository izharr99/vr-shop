"use client";

import { useMemo, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { useApp } from "@/lib/store";
import { byId, type CatalogItem } from "@/lib/catalog";
import { moveState } from "@/lib/moveState";
import {
  createGarmentMesh,
  installCoverHider,
  coveredRegions,
} from "@/lib/garment3d";

const SKIN = "#c9967d";
const JOINTS = "#6e5347";

export default function AvatarModel() {
  const { avatarUrl } = useApp();
  return <LoadedAvatar url={avatarUrl} />;
}

function LoadedAvatar({ url }: { url: string }) {
  const { measurements, worn, sizeDelta, viewMode } = useApp();
  const buildFactor = measurements?.buildFactor ?? 1;
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { camera } = useThree();
  // strip scale tracks so animations can't stomp the build morph's bone scales
  const clips = useMemo(
    () =>
      animations.map(
        (clip) =>
          new THREE.AnimationClip(
            clip.name,
            clip.duration,
            clip.tracks.filter((t) => !t.name.endsWith(".scale"))
          )
      ),
    [animations]
  );
  const { actions } = useAnimations(clips, group);
  const current = useRef<string | null>(null);

  // skinned body meshes: the smooth surface receives garments, the joint
  // balls get hidden under clothing; head bone anchors the hat
  const { surface, joints } = useMemo(() => {
    let surface: THREE.SkinnedMesh | null = null;
    let joints: THREE.SkinnedMesh | null = null;
    model.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh) {
        // the garment source is the high-poly smooth skin; the other mesh
        // is the mannequin's mechanical joint balls
        if (!surface || obj.geometry.getAttribute("position").count >
            surface.geometry.getAttribute("position").count) {
          if (surface) joints = surface;
          surface = obj;
        } else joints = obj;
      }
    });
    return {
      surface: surface as THREE.SkinnedMesh | null,
      joints: joints as THREE.SkinnedMesh | null,
    };
  }, [model]);
  // bones live in a ref — useFrame nudges them (head look, breathing)
  const bones = useRef<{
    head: THREE.Bone | null;
    neck: THREE.Bone | null;
    chest: THREE.Bone | null;
  }>({ head: null, neck: null, chest: null });
  useEffect(() => {
    const b = bones.current;
    b.head = b.neck = b.chest = null;
    model.traverse((obj) => {
      if (obj instanceof THREE.Bone) {
        if (obj.name.endsWith("Head")) b.head = obj;
        if (obj.name.endsWith("Neck")) b.neck = obj;
        if (/Spine2$/.test(obj.name)) b.chest = obj;
      }
    });
  }, [model]);
  const hatRef = useRef<THREE.Group>(null);
  const detailRef = useRef<THREE.Group>(null);
  const collarRef = useRef<THREE.Group>(null);

  // skin-tone mannequin materials
  const hideCovered = useRef<((mask: number) => void) | null>(null);
  useEffect(() => {
    model.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh || obj instanceof THREE.Mesh) {
        const isJoints = obj === joints || /Joint/i.test(obj.name);
        obj.material = new THREE.MeshStandardMaterial({
          color: isJoints ? JOINTS : SKIN,
          roughness: isJoints ? 0.5 : 0.62,
          metalness: 0.02,
        });
        obj.castShadow = true;
        obj.frustumCulled = false;
      }
    });
    hideCovered.current = joints ? installCoverHider(joints) : null;
  }, [model, joints]);

  // build morph — bone scales compound down the chain, so distribute:
  // sqrt(f) at the hips, equal steps up the spine → chest ends at exactly f
  const breatheBase = useRef(new Map<THREE.Bone, number>());
  useEffect(() => {
    const f = buildFactor;
    const hipsScale = Math.sqrt(f);
    const spineStep = Math.cbrt(f / hipsScale);
    let foundBones = false;
    breatheBase.current.clear();
    model.traverse((obj) => {
      if (obj instanceof THREE.Bone) {
        if (obj.name.endsWith("Hips")) {
          obj.scale.set(hipsScale, 1, hipsScale);
          foundBones = true;
        } else if (/Spine\d?$/.test(obj.name)) {
          obj.scale.set(spineStep, 1, spineStep);
          if (/Spine2$/.test(obj.name)) breatheBase.current.set(obj, spineStep);
        } else if (obj.name.endsWith("Neck")) {
          obj.scale.set(1 / f, 1, 1 / f); // keep the head normal width
        }
      }
    });
    if (!foundBones) model.scale.set(f, 1, f);
  }, [model, buildFactor]);

  // worn garments as skinned clones of the surface mesh
  const wornItems = Object.values(worn)
    .filter((id): id is string => !!id)
    .map(byId)
    .filter((i): i is CatalogItem => !!i);
  const wornKey = wornItems
    .map((i) => `${i.id}:${sizeDelta[i.slot] ?? 0}`)
    .sort()
    .join(",");
  useEffect(() => {
    const clones: THREE.SkinnedMesh[] = [];
    if (surface?.parent) {
      for (const item of wornItems) {
        const m = createGarmentMesh(surface, item, sizeDelta[item.slot] ?? 0);
        if (m) {
          surface.parent.add(m);
          clones.push(m);
          // settle offset lives in parent units — undo the rig's world scale
          m.updateWorldMatrix(true, false);
          const ws = new THREE.Vector3();
          m.getWorldScale(ws);
          m.userData.settle = { start: -1, amp: 0.05 / (ws.y || 1) };
        }
      }
    }
    hideCovered.current?.(coveredRegions(wornItems));
    return () => {
      clones.forEach((c) => {
        c.parent?.remove(c);
        (c.material as THREE.Material).dispose();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface, wornKey]);

  // keep the hat on the head (bone tracked in group-local space so the
  // rig's internal 0.01 scale never touches the hat)
  const v = useRef(new THREE.Vector3()).current;
  const camLocal = useRef(new THREE.Vector3()).current;
  useFrame((state, delta) => {
    const g = group.current;
    const { head, neck, chest } = bones.current;
    if (!g) return;
    if (hatRef.current && head) {
      head.getWorldPosition(v);
      g.worldToLocal(v);
      hatRef.current.position.set(v.x, v.y + 0.16, v.z + 0.01);
    }
    // chest details (zip/buttons) ride the chest bone
    if (detailRef.current && chest) {
      chest.getWorldPosition(v);
      g.worldToLocal(v);
      detailRef.current.position.set(v.x, v.y + 0.05, v.z);
    }
    if (collarRef.current && neck) {
      neck.getWorldPosition(v);
      g.worldToLocal(v);
      collarRef.current.position.set(v.x, v.y - 0.02, v.z);
    }

    // idle breathing — gentle chest swell layered onto the build morph
    const base = breatheBase.current;
    if (base.size && !moveState.moving) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.012;
      base.forEach((b, bone) => bone.scale.set(b * s, 1, b * s));
    }

    // in the fitting-room view the avatar meets your eyes
    if (head && viewMode === "front") {
      camLocal.copy(camera.position);
      g.worldToLocal(camLocal);
      const yawToCam = Math.atan2(camLocal.x, camLocal.z);
      const t = 1 - Math.pow(0.001, delta);
      head.rotation.y +=
        (THREE.MathUtils.clamp(yawToCam, -0.5, 0.5) - 0) * 0.5 * t;
    }

    // fresh garments settle onto the body (state lives in mesh.userData)
    g.traverse((o) => {
      const s = o.userData.settle as { start: number; amp: number } | undefined;
      if (!s) return;
      if (s.start < 0) s.start = state.clock.elapsedTime;
      const t = state.clock.elapsedTime - s.start;
      if (t >= 0.4) {
        o.position.y = 0;
        delete o.userData.settle;
      } else {
        const k = 1 - t / 0.4;
        o.position.y = s.amp * k * k * Math.cos(t * 18);
      }
    });
  });

  // crossfade idle ↔ walk with movement
  useFrame(() => {
    const want = moveState.moving ? "walk" : "idle";
    if (current.current === want) return;
    const next = actions[want];
    if (!next) return;
    const prev = current.current ? actions[current.current] : null;
    prev?.fadeOut(0.25);
    next.reset().fadeIn(0.25).play();
    current.current = want;
  });

  const hat = wornItems.find((i) => i.slot === "hat");
  const top = wornItems.find((i) => i.slot === "top");
  const f = buildFactor;

  return (
    <group ref={group}>
      <primitive object={model} />
      {hat && (
        <group ref={hatRef}>
          <Hat item={hat} />
        </group>
      )}
      {top && /shirt|blazer/.test(top.id) && (
        <group ref={collarRef}>
          <Collar color={top.accent ?? top.color} />
        </group>
      )}
      {top && (
        <group ref={detailRef}>
          {/hoodie/.test(top.id) && <Zip build={f} accent={top.accent} />}
          {/shirt|blazer/.test(top.id) && (
            <Buttons build={f} blazer={/blazer/.test(top.id)} />
          )}
        </group>
      )}
    </group>
  );
}

/** Folded collar ring at the neckline. */
function Collar({ color }: { color: string }) {
  return (
    <mesh castShadow rotation={[Math.PI / 2 + 0.25, 0, 0]}>
      <torusGeometry args={[0.085, 0.024, 10, 24]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

/** Hoodie zipper — a slim dark strip with a pull. */
function Zip({ build, accent }: { build: number; accent?: string }) {
  const zf = 0.135 * build + 0.018;
  return (
    <group position={[0, -0.05, zf]}>
      <mesh>
        <boxGeometry args={[0.014, 0.34, 0.006]} />
        <meshStandardMaterial color={accent ?? "#20262b"} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.14, 0.004]}>
        <boxGeometry args={[0.02, 0.035, 0.008]} />
        <meshStandardMaterial color="#c8ccd0" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

/** Button column for shirts; two statement buttons for blazers. */
function Buttons({ build, blazer }: { build: number; blazer: boolean }) {
  const zf = 0.135 * build + 0.02;
  const ys = blazer ? [-0.12, -0.19] : [0.08, 0.0, -0.08, -0.16];
  return (
    <group position={[0, 0, zf]}>
      {ys.map((y) => (
        <mesh key={y} position={[blazer ? 0.03 : 0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[blazer ? 0.011 : 0.008, blazer ? 0.011 : 0.008, 0.005, 12]} />
          <meshStandardMaterial
            color={blazer ? "#8a6f3c" : "#f2efe9"}
            roughness={0.35}
            metalness={blazer ? 0.6 : 0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function Hat({ item }: { item: CatalogItem }) {
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.115, 0.12, 0.11, 20]} />
        <meshStandardMaterial color={item.color} roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, -0.045, 0.04]}>
        <cylinderGeometry args={[0.18, 0.18, 0.018, 20]} />
        <meshStandardMaterial color={item.color} roughness={0.75} />
      </mesh>
      <mesh position={[0, -0.025, 0]}>
        <cylinderGeometry args={[0.121, 0.121, 0.03, 20]} />
        <meshStandardMaterial
          color={item.accent ?? "#222"}
          roughness={0.6}
        />
      </mesh>
    </group>
  );
}

useGLTF.preload("/avatars/mannequin.glb");
