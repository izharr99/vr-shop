"use client";

import { Text, MeshReflectorMaterial } from "@react-three/drei";

function Shop({
  position,
  name,
  color,
}: {
  position: [number, number, number];
  name: string;
  color: string;
}) {
  const [x, , z] = position;
  const W = 12; // width
  const D = 9; // depth
  const H = 4; // height
  return (
    <group position={[x, 0, z]}>
      {/* floor */}
      <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#d8cfc4" />
      </mesh>
      {/* back + side walls (open front) */}
      <mesh position={[0, H / 2, -D / 2]} receiveShadow>
        <boxGeometry args={[W, H, 0.2]} />
        <meshStandardMaterial color="#f2ede6" />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, H, D]} />
        <meshStandardMaterial color="#f2ede6" />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, H, D]} />
        <meshStandardMaterial color="#f2ede6" />
      </mesh>
      {/* roof + sign band */}
      <mesh position={[0, H + 0.1, 0]}>
        <boxGeometry args={[W + 0.4, 0.2, D + 0.4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, H - 0.5, D / 2]}>
        <boxGeometry args={[W, 1, 0.15]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text
        position={[0, H - 0.5, D / 2 + 0.1]}
        fontSize={0.6}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
      {/* fitting mirror on the back wall */}
      <group position={[W / 2 - 1.2, 0, -D / 2 + 0.15]}>
        <mesh position={[0, 1.1, 0]}>
          <planeGeometry args={[1.6, 2.2]} />
          <MeshReflectorMaterial
            mirror={1}
            resolution={1024}
            mixStrength={1}
            roughness={0}
            metalness={0.5}
            color="#ffffff"
          />
        </mesh>
        <mesh position={[0, 1.1, -0.03]}>
          <boxGeometry args={[1.8, 2.4, 0.05]} />
          <meshStandardMaterial color="#8a7250" />
        </mesh>
        <Text position={[0, 2.45, 0.02]} fontSize={0.16} color="#333">
          FITTING MIRROR
        </Text>
      </group>
    </group>
  );
}

export default function Mall() {
  return (
    <group>
      {/* plaza ground */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#9aa5a1" />
      </mesh>
      {/* walkway */}
      <mesh receiveShadow position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 40]} />
        <meshStandardMaterial color="#b8b2a7" />
      </mesh>

      <Shop position={[-9, 0, -10]} name="URBAN BASICS · Streetwear" color="#c0392b" />
      <Shop position={[9, 0, -10]} name="TAILORED · Formal" color="#1a2942" />

      {/* welcome arch */}
      <Text position={[0, 4.5, 6]} fontSize={0.9} color="#222" anchorX="center">
        VR MALL
      </Text>

      {/* a few planters for life */}
      {[-4, 4].map((x) =>
        [2, 8].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <mesh castShadow position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.45, 0.55, 0.6, 16]} />
              <meshStandardMaterial color="#6d5b48" />
            </mesh>
            <mesh castShadow position={[0, 0.95, 0]}>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial color="#2e7d4f" />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
}
