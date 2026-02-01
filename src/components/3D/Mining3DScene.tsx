import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float } from '@react-three/drei';
import * as THREE from 'three';

// Mining structure
function MiningStructure() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.1;
    }
  });

  return (
    // @ts-expect-error - React Three Fiber types conflict with React 19
    <Float speed={1} rotationIntensity={0.3} floatIntensity={0.5}>
      {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
      <group ref={groupRef}>
        {/* Mine entrance */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <mesh position={[0, 0, 0]}>
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <boxGeometry args={[4, 3, 2]} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        </mesh>
        
        {/* Mining tower */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <mesh position={[0, 2, 0]}>
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        </mesh>
        
        {/* Metal ores floating */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const radius = 3;
          return (
            // @ts-expect-error - React Three Fiber types conflict with React 19
            <Float key={i} speed={1.5 + i * 0.2} rotationIntensity={1} floatIntensity={0.8}>
              {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
              <mesh position={[Math.cos(angle) * radius, 1 + i * 0.3, Math.sin(angle) * radius]}>
                {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
                <icosahedronGeometry args={[0.4, 0]} />
                {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
                <meshStandardMaterial 
                  color={i % 2 === 0 ? "#ffd700" : "#c0c0c0"}
                  metalness={0.9}
                  roughness={0.1}
                  emissive={i % 2 === 0 ? "#ffd700" : "#c0c0c0"}
                  emissiveIntensity={0.2}
                />
                {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
              </mesh>
            </Float>
          );
        })}
      {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
      </group>
    </Float>
  );
}

export default function Mining3DScene() {
  return (
    <div className="absolute inset-0 w-full h-full" style={{ minHeight: '100%', minWidth: '100%' }}>
      <Canvas
        camera={{ position: [0, 3, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        className="w-full h-full"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <PerspectiveCamera makeDefault position={[0, 3, 8]} />
        
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <ambientLight intensity={0.5} />
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <directionalLight position={[5, 5, 5]} intensity={1} />
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <pointLight position={[-5, 3, -5]} intensity={0.5} color="#ffd700" />
        
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <fog attach="fog" args={['#000011', 5, 15]} />
        
        <MiningStructure />
        
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.8}
        />
      </Canvas>
    </div>
  );
}
