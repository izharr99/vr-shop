"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { useXR } from "@react-three/xr";
import * as THREE from "three";
import AvatarModel from "./AvatarModel";

const SPEED = 3.5;
const BOUNDS = 28;
const CAM_BACK = 3.2;
const CAM_UP = 2.1;

/**
 * Third-person rig: WASD/arrows move the avatar, drag the mouse to turn.
 * In VR the headset takes over the camera and the avatar stays put in
 * front of you so you can inspect your outfit.
 */
export default function PlayerRig() {
  const group = useRef<THREE.Group>(null);
  const yaw = useRef(0);
  const [, get] = useKeyboardControls();
  const { gl, camera } = useThree();
  const inXR = useXR((s) => s.session != null);

  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    const down = () => (dragging = true);
    const up = () => (dragging = false);
    const move = (e: PointerEvent) => {
      if (dragging) yaw.current -= e.movementX * 0.005;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", move);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointermove", move);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;

    const { forward, backward, left, right } = get();
    const dir = new THREE.Vector3(
      (right ? 1 : 0) - (left ? 1 : 0),
      0,
      (backward ? 1 : 0) - (forward ? 1 : 0)
    );
    if (dir.lengthSq() > 0) {
      dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
      g.position.addScaledVector(dir, SPEED * delta);
      g.position.x = THREE.MathUtils.clamp(g.position.x, -BOUNDS, BOUNDS);
      g.position.z = THREE.MathUtils.clamp(g.position.z, -BOUNDS, BOUNDS);
    }
    g.rotation.y = yaw.current;

    if (!inXR) {
      // follow camera behind the avatar
      const back = new THREE.Vector3(0, CAM_UP, CAM_BACK).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        yaw.current
      );
      camera.position.lerp(g.position.clone().add(back), 0.15);
      const target = g.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      camera.lookAt(target);
    }
  });

  return (
    <group ref={group} position={[0, 0, 8]}>
      <AvatarModel />
    </group>
  );
}
