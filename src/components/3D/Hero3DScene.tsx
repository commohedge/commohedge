import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float } from '@react-three/drei';
import * as THREE from 'three';

// Ocean waves component
function OceanWaves() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = -Math.PI / 2;
      const time = state.clock.getElapsedTime();
      const geometry = meshRef.current.geometry;
      if (geometry && 'attributes' in geometry && geometry.attributes.position) {
        const positions = geometry.attributes.position.array as Float32Array;
        
        for (let i = 0; i < positions.length; i += 3) {
          const x = positions[i];
          const z = positions[i + 2];
          positions[i + 1] = Math.sin(x * 0.1 + time) * 0.5 + Math.cos(z * 0.1 + time * 0.8) * 0.3;
        }
        
        geometry.attributes.position.needsUpdate = true;
        if ('computeVertexNormals' in geometry) {
          geometry.computeVertexNormals();
        }
      }
    }
  });

  return (
    // @ts-expect-error - React Three Fiber types conflict with React 19
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
      <planeGeometry args={[100, 100, 50, 50]} />
      {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
      <meshStandardMaterial 
        color="#0a1929" 
        transparent 
        opacity={0.8}
        roughness={0.5}
        metalness={0.3}
      />
      {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
    </mesh>
  );
}

// Cargo ship component
function CargoShip({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const shipRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (shipRef.current) {
      const time = state.clock.getElapsedTime();
      shipRef.current.position.x = position[0] + Math.sin(time * 0.1 + rotation) * 2;
      shipRef.current.position.y = position[1] + Math.sin(time * 0.3) * 0.3;
      shipRef.current.rotation.z = Math.sin(time * 0.2) * 0.1;
    }
  });

  return (
    // @ts-expect-error - React Three Fiber types conflict with React 19
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
      <group ref={shipRef} position={position} rotation={[0, rotation, 0]}>
        {/* Ship hull */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <mesh position={[0, 0, 0]}>
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <boxGeometry args={[8, 2, 3]} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        </mesh>
        {/* Ship deck */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <mesh position={[0, 1.5, 0]}>
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <boxGeometry args={[6, 0.5, 2.5]} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <meshStandardMaterial color="#16213e" metalness={0.6} roughness={0.3} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        </mesh>
        {/* Containers */}
        {[...Array(6)].map((_, i) => (
          // @ts-expect-error - React Three Fiber types conflict with React 19
          <mesh key={i} position={[-2 + i * 0.8, 2.5, 0]}>
            {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
            <boxGeometry args={[0.7, 1.5, 0.7]} />
            {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
            <meshStandardMaterial 
              color={i % 2 === 0 ? "#C4D82E" : "#1a1a2e"} 
              metalness={0.7} 
              roughness={0.2}
              emissive={i % 2 === 0 ? "#C4D82E" : "#000000"}
              emissiveIntensity={0.3}
            />
            {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          </mesh>
        ))}
        {/* Bridge */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <mesh position={[3, 1.5, 0]}>
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <boxGeometry args={[1.5, 2, 1.5]} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
          <meshStandardMaterial color="#0f3460" metalness={0.5} roughness={0.4} />
          {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        </mesh>
      {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
      </group>
    </Float>
  );
}

// Main 3D Scene
export default function Hero3DScene() {
  return (
    <div className="absolute inset-0 w-full h-full" style={{ minHeight: '100%', minWidth: '100%' }}>
      <Canvas
        camera={{ position: [0, 5, 15], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        className="w-full h-full"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <PerspectiveCamera makeDefault position={[0, 5, 15]} />
        
        {/* Lighting */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <ambientLight intensity={0.4} />
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <pointLight position={[-10, 10, -5]} intensity={0.5} color="#C4D82E" />
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <spotLight position={[0, 20, 0]} angle={0.3} penumbra={1} intensity={0.8} castShadow />
        
        {/* Environment */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <fog attach="fog" args={['#000011', 20, 50]} />
        
        {/* Ocean */}
        <OceanWaves />
        
        {/* Cargo Ships */}
        <CargoShip position={[-8, 0, -5]} rotation={0.5} />
        <CargoShip position={[8, 0, 3]} rotation={-0.3} />
        <CargoShip position={[-3, 0, 8]} rotation={1.2} />
        
        {/* Controls */}
        {/* @ts-expect-error - React Three Fiber types conflict with React 19 */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}
