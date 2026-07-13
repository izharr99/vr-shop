"use client";

import { useState } from "react";
import { Text } from "@react-three/drei";
import type { CatalogItem } from "@/lib/catalog";
import { useApp } from "@/lib/store";

/** A display stand: click/tap (or point-and-select in VR) to try the item on. */
export default function ClothingRack({
  item,
  position,
}: {
  item: CatalogItem;
  position: [number, number, number];
}) {
  const { wear, measurements, showToast, worn } = useApp();
  const [hovered, setHovered] = useState(false);
  const isWorn = worn[item.slot] === item.id;

  const sizeLabel =
    item.slot === "bottom"
      ? `W${measurements?.pantsWaist ?? 32}`
      : item.slot === "hat"
        ? "One size"
        : (measurements?.shirtSize ?? "M");

  function tryOn() {
    wear(item);
    showToast(
      isWorn
        ? `Took off ${item.name}`
        : `Trying on ${item.name} — fits you in ${sizeLabel} · $${item.price}`
    );
  }

  return (
    <group position={position}>
      {/* stand */}
      <mesh castShadow position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 1.5, 8]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 16]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      {/* garment display */}
      <mesh
        castShadow
        position={[0, 1.35, 0]}
        scale={hovered ? 1.12 : 1}
        onClick={(e) => {
          e.stopPropagation();
          tryOn();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {item.slot === "hat" ? (
          <sphereGeometry args={[0.16, 16, 16]} />
        ) : item.slot === "bottom" ? (
          <boxGeometry args={[0.32, 0.5, 0.12]} />
        ) : (
          <boxGeometry args={[0.42, 0.5, 0.16]} />
        )}
        <meshStandardMaterial
          color={item.color}
          emissive={isWorn ? "#22c55e" : hovered ? "#666600" : "#000000"}
          emissiveIntensity={isWorn ? 0.35 : 0.5}
          roughness={0.8}
        />
      </mesh>
      <Text position={[0, 1.85, 0]} fontSize={0.11} color="#111" anchorX="center">
        {item.name}
      </Text>
      <Text position={[0, 1.72, 0]} fontSize={0.1} color="#0a5c36" anchorX="center">
        ${item.price} · your size: {sizeLabel}
      </Text>
      {isWorn && (
        <Text position={[0, 2.0, 0]} fontSize={0.1} color="#059669" anchorX="center">
          ✓ WEARING
        </Text>
      )}
    </group>
  );
}
