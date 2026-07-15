"use client";

import { Text, MeshReflectorMaterial } from "@react-three/drei";

/** Folded-clothes cubbies along a shop wall. */
function Shelf({
  position,
  rotation = 0,
  colors,
}: {
  position: [number, number, number];
  rotation?: number;
  colors: string[];
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 1, 0]}>
        <boxGeometry args={[2.4, 2, 0.35]} />
        <meshStandardMaterial color="#a98f6f" roughness={0.85} />
      </mesh>
      {[0.55, 1.15, 1.75].map((y, row) => (
        <group key={y}>
          <mesh position={[0, y - 0.14, 0.19]}>
            <boxGeometry args={[2.3, 0.04, 0.3]} />
            <meshStandardMaterial color="#8a7250" roughness={0.9} />
          </mesh>
          {[-0.8, -0.27, 0.27, 0.8].map((x, col) => (
            <mesh key={x} position={[x, y, 0.14]}>
              <boxGeometry args={[0.42, 0.16, 0.3]} />
              <meshStandardMaterial
                color={colors[(row * 4 + col) % colors.length]}
                roughness={0.95}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Stylized display mannequin — a quiet NPC that dresses the room. */
function Mannequin({
  position,
  top,
  bottom,
  rotation = 0,
}: {
  position: [number, number, number];
  top: string;
  bottom: string;
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.06, 20]} />
        <meshStandardMaterial color="#555" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* legs */}
      <mesh castShadow position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.13, 0.1, 0.95, 14]} />
        <meshStandardMaterial color={bottom} roughness={0.9} />
      </mesh>
      {/* torso */}
      <mesh castShadow position={[0, 1.28, 0]}>
        <capsuleGeometry args={[0.17, 0.42, 6, 14]} />
        <meshStandardMaterial color={top} roughness={0.9} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial color="#e8e2d9" roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Step-in fitting booth: three walls, curtain rod, big mirror you face. */
function FittingBooth({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const W = 2.2;
  const D = 2.2;
  const H = 2.6;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* back and side walls */}
      <mesh position={[0, H / 2, -D / 2]} receiveShadow>
        <boxGeometry args={[W, H, 0.08]} />
        <meshStandardMaterial color="#e5ddd1" />
      </mesh>
      {[-W / 2, W / 2].map((x) => (
        <mesh key={x} position={[x, H / 2, 0]} receiveShadow>
          <boxGeometry args={[0.08, H, D]} />
          <meshStandardMaterial color="#e5ddd1" />
        </mesh>
      ))}
      {/* curtain rod + half-open curtain */}
      <mesh position={[0, H - 0.15, D / 2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, W, 10]} />
        <meshStandardMaterial color="#b8a888" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[-W / 2 + 0.35, H / 2 - 0.15, D / 2]}>
        <boxGeometry args={[0.65, H - 0.35, 0.03]} />
        <meshStandardMaterial color="#7d5a7a" roughness={0.95} />
      </mesh>
      {/* the mirror, full height on the back wall */}
      <mesh position={[0, 1.32, -D / 2 + 0.06]}>
        <planeGeometry args={[1.5, 2.3]} />
        <MeshReflectorMaterial
          mirror={1}
          resolution={1024}
          mixStrength={1}
          roughness={0}
          metalness={0.4}
          color="#ffffff"
        />
      </mesh>
      <mesh position={[0, 1.32, -D / 2 + 0.045]}>
        <boxGeometry args={[1.66, 2.46, 0.05]} />
        <meshStandardMaterial color="#8a7250" />
      </mesh>
      {/* warm booth light */}
      <pointLight position={[0, H - 0.3, 0.3]} intensity={2.2} distance={4} color="#ffe9c9" />
      <Text position={[0, H + 0.12, D / 2]} fontSize={0.17} color="#5b4a33" anchorX="center">
        FITTING ROOM
      </Text>
    </group>
  );
}

function Shop({
  position,
  name,
  color,
  shelfColors,
  mannequins,
}: {
  position: [number, number, number];
  name: string;
  color: string;
  shelfColors: string[];
  mannequins: [string, string][];
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
      {/* interior warm light */}
      <pointLight position={[0, H - 0.6, 0]} intensity={5} distance={12} color="#fff1dc" />

      {/* wall shelves with folded stock */}
      <Shelf position={[-W / 2 + 0.4, 0, -1]} rotation={Math.PI / 2} colors={shelfColors} />
      <Shelf position={[0, 0, -D / 2 + 0.4]} colors={[...shelfColors].reverse()} />

      {/* display mannequins by the entrance */}
      <Mannequin position={[-W / 2 + 1.1, 0, D / 2 - 1]} top={mannequins[0][0]} bottom={mannequins[0][1]} rotation={0.5} />
      <Mannequin position={[W / 2 - 3.4, 0, D / 2 - 0.8]} top={mannequins[1][0]} bottom={mannequins[1][1]} rotation={-0.4} />

      {/* step-in fitting booth in the back corner */}
      <FittingBooth position={[W / 2 - 1.5, 0, -D / 2 + 1.3]} />
    </group>
  );
}

function Bench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[1.7, 0.08, 0.5]} />
        <meshStandardMaterial color="#9c7b52" roughness={0.85} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} castShadow position={[x, 0.2, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.45]} />
          <meshStandardMaterial color="#5c5c5c" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
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

      <Shop
        position={[-9, 0, -10]}
        name="URBAN BASICS · Streetwear"
        color="#c0392b"
        shelfColors={["#c0392b", "#2471a3", "#1e8449", "#212121", "#7f8c8d", "#e74c3c"]}
        mannequins={[
          ["#1e8449", "#34495e"],
          ["#212121", "#7f8c8d"],
        ]}
      />
      <Shop
        position={[9, 0, -10]}
        name="TAILORED · Formal"
        color="#1a2942"
        shelfColors={["#ecf0f1", "#1a2942", "#d98880", "#4d5656", "#b9905f", "#5d4037"]}
        mannequins={[
          ["#1a2942", "#4d5656"],
          ["#ecf0f1", "#b9905f"],
        ]}
      />

      {/* welcome arch */}
      <group position={[0, 0, 6]}>
        {[-3.2, 3.2].map((x) => (
          <mesh key={x} castShadow position={[x, 2.2, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 4.4, 12]} />
            <meshStandardMaterial color="#44494d" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        <mesh castShadow position={[0, 4.45, 0]}>
          <boxGeometry args={[7.2, 0.5, 0.3]} />
          <meshStandardMaterial color="#44494d" metalness={0.6} roughness={0.4} />
        </mesh>
        <Text position={[0, 4.47, 0.17]} fontSize={0.62} color="#ffe9c9" anchorX="center" anchorY="middle">
          VR MALL
        </Text>
      </group>

      {/* street furniture */}
      <Bench position={[-2.2, 0, 1]} rotation={0.4} />
      <Bench position={[2.4, 0, 4]} rotation={-0.5} />

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
