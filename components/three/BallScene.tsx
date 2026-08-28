// components/three/BallScene.tsx
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SpinningBall: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.x += delta * 0.15;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.4, 1]} />
      <meshStandardMaterial
        color="#f4f9f2"
        emissive="#fb923c"
        emissiveIntensity={0.25}
        flatShading
        roughness={0.35}
        metalness={0.1}
      />
    </mesh>
  );
};

const BallScene: React.FC = () => (
  <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} dpr={[1, 1.5]}>
    <ambientLight intensity={0.4} />
    <spotLight position={[4, 6, 5]} angle={0.35} penumbra={0.5} intensity={2.2} color="#fbbf24" />
    <spotLight position={[-4, -2, 3]} angle={0.4} penumbra={0.6} intensity={1.1} color="#fb923c" />
    <SpinningBall />
  </Canvas>
);

export default BallScene;
