"use client";

import { useMemo, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { useApp } from "@/lib/store";
import { byId } from "@/lib/catalog";
import Garment from "./Garment";

/** RPM avatar + body-build morph + worn garments. */
export default function AvatarModel() {
  const { avatarUrl, measurements, worn } = useApp();
  const buildFactor = measurements?.buildFactor ?? 1;

  if (!avatarUrl) return null;
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
  const { scene } = useGLTF(url);
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene]);

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
        if (obj.name === "Hips") {
          obj.scale.set(hipsScale, 1, hipsScale);
          foundBones = true;
        } else if (["Spine", "Spine1", "Spine2"].includes(obj.name)) {
          obj.scale.set(spineStep, 1, spineStep);
        } else if (obj.name === "Neck") {
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

  return <primitive object={model} />;
}
