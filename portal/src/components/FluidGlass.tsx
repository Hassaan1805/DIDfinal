import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

interface FluidGlassProps {
  className?: string
  children?: React.ReactNode
  intensity?: number
  roughness?: number
  transmission?: number
  thickness?: number
  chromaticAberration?: number
  anisotropy?: number
}

function Blob({ intensity = 0.5 }: { intensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 32, 32)
    const positions = geo.attributes.position.array as Float32Array
    
    // Add some organic deformation
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      
      const noise = Math.sin(x * 3) * Math.cos(y * 3) * Math.sin(z * 3) * 0.1
      positions[i] = x + noise
      positions[i + 1] = y + noise
      positions[i + 2] = z + noise
    }
    
    geo.attributes.position.needsUpdate = true
    return geo
  }, [])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1 * intensity)
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <MeshTransmissionMaterial
        transmission={0.9}
        thickness={0.5}
        roughness={0.0}
        chromaticAberration={0.1}
        anisotropy={0.1}
        envMapIntensity={1}
        transparent
      />
    </mesh>
  )
}

export default function FluidGlass({
  className = '',
  children,
  intensity = 0.5,
  // Commenting out unused parameters to fix TypeScript warnings
  // roughness = 0.0,
  // transmission = 0.9,
  // thickness = 0.5,
  // chromaticAberration = 0.1,
  // anisotropy = 0.1,
}: FluidGlassProps) {
  return (
    <div className={`relative ${className}`}>
      {/* WebGL Background */}
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <Canvas
          camera={{ position: [0, 0, 3], fov: 45 }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Blob intensity={intensity} />
        </Canvas>
      </div>
      
      {/* Glassmorphism Overlay */}
      <div 
        className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        {children}
      </div>
    </div>
  )
}