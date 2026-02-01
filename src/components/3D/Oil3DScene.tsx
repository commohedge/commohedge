import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float } from '@react-three/drei';
import * as THREE from 'three';

// Oil rig structure
function OilRig() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.05) * 0.1;
    }
  });

  return (
    // @ts-expect-error - React Three Fiber types conflict with React 19
    <Float speed={0.8} rotationIntensity={0.2} floatIntensity={0.3}>
      {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
      <group ref={groupRef}>
        {/* Platform base */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <mesh position={[0, -1, 0]}>
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <boxGeometry args={[6, 0.5, 6]} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        </mesh>
        
        {/* Main tower */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <mesh position={[0, 1, 0]}>
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <cylinderGeometry args={[0.3, 0.3, 6, 8]} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <meshStandardMaterial color="#2a2a3e" metalness={0.8} roughness={0.2} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        </mesh>
        
        {/* Drilling platform */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <mesh position={[0, 4, 0]}>
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <boxGeometry args={[2, 0.5, 2]} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <meshStandardMaterial color="#0f3460" metalness={0.7} roughness={0.3} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        </mesh>
        
        {/* Pipes */}
        {[...Array(4)].map((_, i) => {
          const angle = (i / 4) * Math.PI * 2;
          return (
            // @ts-expect-error - React Three Fiber types conflict with React 19
            <mesh key={i} position={[Math.cos(angle) * 2, 0, Math.sin(angle) * 2]}>
              {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
              <cylinderGeometry args={[0.1, 0.1, 2, 8]} />
              {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
              <meshStandardMaterial color="#C4D82E" metalness={0.6} roughness={0.4} />
              {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
            </mesh>
          );
        })}
        
        {/* Energy particles */}
        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const radius = 2.5;
          return (
            // @ts-expect-error - React Three Fiber types conflict with React 19
            <Float key={i} speed={2 + i * 0.1} rotationIntensity={1.5} floatIntensity={1}>
              {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
              <mesh position={[Math.cos(angle) * radius, 1 + i * 0.2, Math.sin(angle) * radius]}>
                {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
                <sphereGeometry args={[0.15, 8, 8]} />
                {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
                <meshStandardMaterial 
                  color="#C4D82E"
                  emissive="#C4D82E"
                  emissiveIntensity={0.8}
                  transparent
                  opacity={0.7}
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

export default function Oil3DScene() {
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
        <ambientLight intensity={0.4} />
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <directionalLight position={[5, 5, 5]} intensity={1} />
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <pointLight position={[0, 5, 0]} intensity={0.8} color="#C4D82E" />
        
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <fog attach="fog" args={['#000011', 5, 15]} />
        
        <OilRig />
        
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
        />
      </Canvas>
    </div>
  );
}
