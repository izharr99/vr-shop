"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { useXR } from "@react-three/xr";
import * as THREE from "three";
import AvatarModel from "./AvatarModel";
import { moveState } from "@/lib/moveState";
import { useApp } from "@/lib/store";

const SPEED = 3.5;
const BOUNDS = 28;
const CAM_BACK = 3.2;
const CAM_UP = 2.1;
const CAM_FRONT = 2.6;
const CAM_FRONT_UP = 1.5;
const SPIN_SPEED = (Math.PI * 2) / 6; // full turn in 6s

/**
 * Third-person rig: WASD/arrows (or touch joystick) move the avatar, drag to
 * turn. Trying something on swings the camera around to face the avatar
 * ("front" view); walking swings it back behind. In VR the headset owns the
 * camera and the avatar stays put in front of you.
 */
export default function PlayerRig() {
  const group = useRef<THREE.Group>(null);
  const yaw = useRef(0);
  const spinYaw = useRef(0);
  const [, get] = useKeyboardControls();
  const { gl, camera } = useThree();
  const inXR = useXR((s) => s.session != null);
  const viewMode = useApp((s) => s.viewMode);
  const spinning = useApp((s) => s.spinning);

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

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    const { forward, backward, left, right } = get();
    const dir = new THREE.Vector3(
      (right ? 1 : 0) - (left ? 1 : 0) + moveState.touchX,
      0,
      (backward ? 1 : 0) - (forward ? 1 : 0) + moveState.touchZ
    );
    if (dir.lengthSq() > 1) dir.normalize();
    const moving = dir.lengthSq() > 0.01;
    moveState.moving = moving;
    if (moving) {
      // walking exits the fitting-room view
      const app = useApp.getState();
      if (app.viewMode === "front") app.setViewMode("follow");
      if (app.spinning) app.setSpinning(false);
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
      g.position.addScaledVector(dir, SPEED * delta);
      g.position.x = THREE.MathUtils.clamp(g.position.x, -BOUNDS, BOUNDS);
      g.position.z = THREE.MathUtils.clamp(g.position.z, -BOUNDS, BOUNDS);
    }

    // slow 360° turn-around while showing off the outfit
    if (spinning) {
      spinYaw.current += SPIN_SPEED * delta;
      if (spinYaw.current > Math.PI * 2) {
        spinYaw.current = 0;
        useApp.getState().setSpinning(false);
      }
    } else if (spinYaw.current !== 0) {
      // ease any leftover spin back to facing the camera
      spinYaw.current = THREE.MathUtils.damp(spinYaw.current, 0, 8, delta);
      if (Math.abs(spinYaw.current) < 0.01) spinYaw.current = 0;
    }
    g.rotation.y = yaw.current + spinYaw.current;

    if (!inXR) {
      // the rig visually faces +z, so both views sit on the +z side —
      // "front" is just closer and at eye level, like facing a mirror
      const isFront = viewMode === "front";
      const back = new THREE.Vector3(
        0,
        isFront ? CAM_FRONT_UP : CAM_UP,
        isFront ? CAM_FRONT : CAM_BACK
      ).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
      camera.position.lerp(g.position.clone().add(back), isFront ? 0.06 : 0.15);
      const target = g.position
        .clone()
        .add(new THREE.Vector3(0, isFront ? 1.15 : 1.4, 0));
      camera.lookAt(target);
    }
  });

  return (
    <group ref={group} position={[0, 0, 8]}>
      <AvatarModel />
    </group>
  );
}
