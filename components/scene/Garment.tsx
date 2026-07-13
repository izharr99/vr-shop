"use client";

import type { CatalogItem } from "@/lib/catalog";

/**
 * Stylized procedural garments overlaid on the avatar (origin at feet,
 * avatar ≈ 1.8m tall). Width follows the wearer's buildFactor, so the
 * same hoodie looks snug on a slim avatar and fuller on a heavy one.
 * Real branded 3D assets replace these in the sponsor phase.
 */
export default function Garment({
  item,
  buildFactor: f,
}: {
  item: CatalogItem;
  buildFactor: number;
}) {
  switch (item.slot) {
    case "top":
      return (
        <group>
          {/* torso */}
          <mesh castShadow position={[0, 1.27, 0]}>
            <boxGeometry args={[0.44 * f, 0.56, 0.3 * f]} />
            <meshStandardMaterial color={item.color} roughness={0.8} />
          </mesh>
          {/* sleeves */}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              castShadow
              position={[side * 0.29 * f, 1.42, 0]}
              rotation={[0, 0, side * -0.15]}
            >
              <boxGeometry args={[0.14, 0.32, 0.16]} />
              <meshStandardMaterial color={item.accent ?? item.color} roughness={0.8} />
            </mesh>
          ))}
          {/* hood hint for hoodies/blazer collar */}
          {item.accent && (
            <mesh castShadow position={[0, 1.56, -0.13 * f]}>
              <sphereGeometry args={[0.12, 12, 12, 0, Math.PI]} />
              <meshStandardMaterial color={item.accent} roughness={0.9} />
            </mesh>
          )}
        </group>
      );
    case "bottom":
      return (
        <group>
          {/* waistband */}
          <mesh castShadow position={[0, 0.95, 0]}>
            <boxGeometry args={[0.4 * f, 0.14, 0.28 * f]} />
            <meshStandardMaterial color={item.color} roughness={0.85} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} castShadow position={[side * 0.11 * f, 0.52, 0]}>
              <cylinderGeometry args={[0.085 * f, 0.075, 0.78, 10]} />
              <meshStandardMaterial color={item.color} roughness={0.85} />
            </mesh>
          ))}
        </group>
      );
    case "hat":
      return (
        <group position={[0, 1.78, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.1, 16]} />
            <meshStandardMaterial color={item.color} roughness={0.7} />
          </mesh>
          <mesh castShadow position={[0, -0.04, 0.05]}>
            <cylinderGeometry args={[0.19, 0.19, 0.02, 16]} />
            <meshStandardMaterial color={item.color} roughness={0.7} />
          </mesh>
        </group>
      );
  }
}
