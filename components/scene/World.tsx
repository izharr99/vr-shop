"use client";

import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Sky } from "@react-three/drei";
import { XR, createXRStore } from "@react-three/xr";
import Mall from "./Mall";
import PlayerRig from "./PlayerRig";
import ClothingRack from "./ClothingRack";
import { CATALOG } from "@/lib/catalog";

export const xrStore = createXRStore();

const keyMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
];

// Rack positions inside each shop, filled in catalog order.
const SHOP_ORIGINS = { street: [-9, 0, -10], formal: [9, 0, -10] } as const;

export default function World() {
  const racks = (["street", "formal"] as const).flatMap((shop) => {
    const items = CATALOG.filter((i) => i.shop === shop);
    const [ox, , oz] = SHOP_ORIGINS[shop];
    return items.map((item, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      return {
        item,
        position: [ox - 3 + col * 2, 0, oz - 1.5 + row * 2.5] as [number, number, number],
      };
    });
  });

  return (
    <KeyboardControls map={keyMap}>
      <Canvas shadows camera={{ position: [0, 3, 12], fov: 60 }}>
        <XR store={xrStore}>
          <Sky sunPosition={[10, 12, 8]} />
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[10, 14, 8]}
            intensity={1.4}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-25}
            shadow-camera-right={25}
            shadow-camera-top={25}
            shadow-camera-bottom={-25}
          />
          <Mall />
          {racks.map(({ item, position }) => (
            <ClothingRack key={item.id} item={item} position={position} />
          ))}
          <PlayerRig />
        </XR>
      </Canvas>
    </KeyboardControls>
  );
}
