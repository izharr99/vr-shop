"use client";

import { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { useApp } from "@/lib/store";
import { byId, type CatalogItem } from "@/lib/catalog";
import { moveState } from "@/lib/moveState";
import { createGarmentMesh } from "@/lib/garment3d";

const SKIN = "#c9967d";
const JOINTS = "#6e5347";

export default function AvatarModel() {
  const { avatarUrl } = useApp();
  return <LoadedAvatar url={avatarUrl} />;
}

function LoadedAvatar({ url }: { url: string }) {
  const { measurements, worn } = useApp();
  const buildFactor = measurements?.buildFactor ?? 1;
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene]);
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

  // all skinned body meshes (garment sources), head bone for hats
  const { bodies, headBone } = useMemo(() => {
    const bodies: THREE.SkinnedMesh[] = [];
    let head: THREE.Bone | null = null;
    model.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh) bodies.push(obj);
      if (obj instanceof THREE.Bone && obj.name.endsWith("Head")) head = obj;
    });
    return { bodies, headBone: head as THREE.Bone | null };
  }, [model]);
  const hatRef = useRef<THREE.Group>(null);

  // skin-tone mannequin materials
  useEffect(() => {
    model.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh || obj instanceof THREE.Mesh) {
        const isJoints = /Joint/i.test(obj.name);
        obj.material = new THREE.MeshStandardMaterial({
          color: isJoints ? JOINTS : SKIN,
          roughness: 0.55,
          metalness: 0.05,
        });
        obj.castShadow = true;
        obj.frustumCulled = false;
      }
    });
  }, [model]);

  // build morph — bone scales compound down the chain, so distribute:
  // sqrt(f) at the hips, equal steps up the spine → chest ends at exactly f
  useEffect(() => {
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
          obj.scale.set(1 / f, 1, 1 / f); // keep the head normal width
        }
      }
    });
    if (!foundBones) model.scale.set(f, 1, f);
  }, [model, buildFactor]);

  // worn garments as skinned clones of the body mesh
  const wornItems = Object.values(worn)
    .filter((id): id is string => !!id)
    .map(byId)
    .filter((i): i is CatalogItem => !!i);
  const wornKey = wornItems.map((i) => i.id).sort().join(",");
  useEffect(() => {
    const clones: THREE.SkinnedMesh[] = [];
    for (const body of bodies) {
      if (!body.parent) continue;
      for (const item of wornItems) {
        const m = createGarmentMesh(body, item);
        if (m) {
          body.parent.add(m);
          clones.push(m);
        }
      }
    }
    return () => {
      clones.forEach((c) => {
        c.parent?.remove(c);
        (c.material as THREE.Material).dispose();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, wornKey]);

  // keep the hat on the head (bone tracked in group-local space so the
  // rig's internal 0.01 scale never touches the hat)
  const v = useRef(new THREE.Vector3()).current;
  useFrame(() => {
    if (hatRef.current && headBone && group.current) {
      headBone.getWorldPosition(v);
      group.current.worldToLocal(v);
      hatRef.current.position.set(v.x, v.y + 0.16, v.z + 0.01);
    }
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

  return (
    <group ref={group}>
      <primitive object={model} />
      {hat && (
        <group ref={hatRef}>
          <Hat item={hat} />
        </group>
      )}
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
