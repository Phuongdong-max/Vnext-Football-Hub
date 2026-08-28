import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const TrophyModel: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.65, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 0.7, 24]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.5, 0.55, 0.2, 32]} />
        <meshStandardMaterial color="#0d2818" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[0.68, 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.05, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[-0.68, 1.1, 0]} rotation={[0, Math.PI, -Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.05, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
};

const TrophyScene: React.FC = () => (
  <Canvas camera={{ position: [0, 1, 4.5], fov: 42 }} dpr={[1, 1.5]}>
    <ambientLight intensity={0.5} />
    <spotLight position={[3, 5, 4]} angle={0.4} penumbra={0.5} intensity={2.4} color="#fbbf24" />
    <spotLight position={[-3, -1, 3]} angle={0.5} penumbra={0.6} intensity={1} color="#fb923c" />
    <TrophyModel />
  </Canvas>
);

export default TrophyScene;
