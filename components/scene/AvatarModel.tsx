"use client";

import { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { useApp } from "@/lib/store";
import { byId } from "@/lib/catalog";
import { moveState } from "@/lib/moveState";
import Garment from "./Garment";

/** Bundled avatar + body-build morph from the photo + worn garments. */
export default function AvatarModel() {
  const { avatarUrl, measurements, worn } = useApp();
  const buildFactor = measurements?.buildFactor ?? 1;

  return (
    <group>
      <LoadedAvatar url={avatarUrl} buildFactor={buildFactor} />
      {Object.values(worn)
        .filter((id): id is string => !!id)
        .map((id) => {
          const item = byId(id);
          return item ? (
            <Garment key={id} item={item} buildFactor={buildFactor} />
          ) : null;
        })}
    </group>
  );
}

function LoadedAvatar({ url, buildFactor }: { url: string; buildFactor: number }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, group);
  const current = useRef<string | null>(null);

  useEffect(() => {
    // Bone scales compound down the chain (Hips → Spine → Spine1 → Spine2),
    // so distribute the factor: sqrt(f) at the hips, then equal steps up the
    // spine so the cumulative width at the chest is exactly f.
    const f = buildFactor;
    const hipsScale = Math.sqrt(f);
    const spineStep = Math.cbrt(f / hipsScale);
    let foundBones = false;
    model.traverse((obj) => {
      if (obj instanceof THREE.Bone) {
        if (obj.name.endsWith("Hips")) {
          obj.scale.set(hipsScale, 1, hipsScale);
          foundBones = true;
        } else if (/Spine\d?$/.test(obj.name)) {
          obj.scale.set(spineStep, 1, spineStep);
        } else if (obj.name.endsWith("Neck")) {
          // keep the head at normal width
          obj.scale.set(1 / f, 1, 1 / f);
        }
      }
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.frustumCulled = false;
      }
    });
    if (!foundBones) model.scale.set(f, 1, f);
  }, [model, buildFactor]);

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

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload("/avatars/mannequin.glb");
