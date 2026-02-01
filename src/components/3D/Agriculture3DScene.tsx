import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float } from '@react-three/drei';
import * as THREE from 'three';

// Agriculture structure
function AgricultureStructure() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.08) * 0.1;
    }
  });

  return (
    // @ts-expect-error - React Three Fiber types conflict with React 19
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
      <group ref={groupRef}>
        {/* Silo */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <mesh position={[0, 0, 0]}>
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <cylinderGeometry args={[1.5, 1.5, 5, 16]} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <meshStandardMaterial color="#3a3a4e" metalness={0.6} roughness={0.4} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        </mesh>
        
        {/* Silo top */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <mesh position={[0, 3, 0]}>
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <coneGeometry args={[1.5, 1, 16]} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <meshStandardMaterial color="#2a2a3e" metalness={0.5} roughness={0.5} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        </mesh>
        
        {/* Grain particles */}
        {[...Array(20)].map((_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const radius = 2 + Math.random() * 2;
          const height = -1 + Math.random() * 3;
          return (
            // @ts-expect-error - React Three Fiber types conflict with React 19
            <Float key={i} speed={1 + Math.random() * 0.5} rotationIntensity={1} floatIntensity={0.7}>
              {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
              <mesh position={[Math.cos(angle) * radius, height, Math.sin(angle) * radius]}>
                {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
                <sphereGeometry args={[0.1, 6, 6]} />
                {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
                <meshStandardMaterial 
                  color="#d4af37"
                  emissive="#d4af37"
                  emissiveIntensity={0.3}
                />
                {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
              </mesh>
            </Float>
          );
        })}
        
        {/* Logistics containers */}
        {[...Array(3)].map((_, i) => (
          // @ts-expect-error - React Three Fiber types conflict with React 19
          <mesh key={i} position={[-3 + i * 3, 0.5, -2]}>
            {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
            <boxGeometry args={[1.5, 1, 1.5]} />
            {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
            <meshStandardMaterial 
              color={i % 2 === 0 ? "#C4D82E" : "#1a1a2e"}
              metalness={0.7}
              roughness={0.3}
              emissive={i % 2 === 0 ? "#C4D82E" : "#000000"}
              emissiveIntensity={0.2}
            />
            {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          </mesh>
        ))}
      {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
      </group>
    </Float>
  );
}

export default function Agriculture3DScene() {
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
        <pointLight position={[-5, 3, -5]} intensity={0.5} color="#d4af37" />
        
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <fog attach="fog" args={['#000011', 5, 15]} />
        
        <AgricultureStructure />
        
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.7}
        />
      </Canvas>
    </div>
  );
}
