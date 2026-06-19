import * as THREE from 'three';
import React, { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { GLTF } from 'three-stdlib';
import { useFrame } from '@react-three/fiber';
import { useStore, useZoneStatusColor, AircraftState } from '@/lib/store';
import { CouplingEffect } from './CouplingEffect';

type GLTFResult = GLTF & {
  nodes: {
    fuselage_skin: THREE.Mesh;
    fuselage_wings: THREE.Mesh;
    zone_engine: THREE.Mesh;
    zone_landing_gear: THREE.Mesh;
    zone_apu: THREE.Mesh;
    zone_ecs: THREE.Mesh;
    zone_hydraulics: THREE.Mesh;
  };
  materials: {};
};

function ZoneMesh({ 
  zoneName, 
  geometry, 
  baseOpacity = 0.8 
}: { 
  zoneName: string, 
  geometry: THREE.BufferGeometry,
  baseOpacity?: number
}) {
  const { color, intensity, isWarning } = useZoneStatusColor(zoneName);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  useFrame((state) => {
    if (!materialRef.current) return;
    if (isWarning) {
      // Pulse emissive intensity when in warning/critical state — boosted to be visible without bloom
      const pulse = (Math.sin(state.clock.elapsedTime * 4) + 1) / 2;
      materialRef.current.emissiveIntensity = 1.2 + pulse * intensity * 4;
    } else {
      materialRef.current.emissiveIntensity = 1.2;
    }
  });

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial 
        ref={materialRef}
        color={color}
        emissive={color}
        emissiveIntensity={1.2}
        transparent
        opacity={baseOpacity}
        wireframe={isWarning}
      />
    </mesh>
  );
}

export default function AircraftModel(props: React.ComponentProps<'group'>) {
  const { nodes } = useGLTF('/aircraft.glb') as unknown as GLTFResult;
  const { dissectAmount } = useStore();
  const ecsFouling = useStore((state) => state.physicsInputs.ecs.foulingPct);

  // Setup clipping plane for the fuselage based on the dissectAmount slider
  const clippingPlane = useMemo(() => {
    const plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 10);
    return plane;
  }, []);

  useFrame(() => {
    // Map dissectAmount (0-100) to a constant range that slices through the model
    // Assuming model bounds roughly -10 to 10 in X
    clippingPlane.constant = 10 - (dissectAmount / 100) * 20;
  });

  // Material for the fuselage that supports clipping
  const fuselageMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1e293b', // slate-800
    metalness: 0.6,
    roughness: 0.4,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    clippingPlanes: [clippingPlane],
  }), [clippingPlane]);

  const wingsMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#334155', // slate-700
    metalness: 0.6,
    roughness: 0.4,
  }), []);

  return (
    <group {...props} dispose={null} rotation={[0, Math.PI / 2, 0]}>
      {/* Structural Elements */}
      <mesh geometry={nodes.fuselage_skin.geometry} material={fuselageMaterial} />
      <mesh geometry={nodes.fuselage_wings.geometry} material={wingsMaterial} />
      
      {/* Anatomical Subsystems */}
      <ZoneMesh zoneName="engine" geometry={nodes.zone_engine.geometry} />
      <ZoneMesh zoneName="landingGear" geometry={nodes.zone_landing_gear.geometry} />
      <ZoneMesh zoneName="apu" geometry={nodes.zone_apu.geometry} />
      <ZoneMesh zoneName="ecs" geometry={nodes.zone_ecs.geometry} />
      <ZoneMesh zoneName="hydraulics" geometry={nodes.zone_hydraulics.geometry} />

      {/* Cross-Domain Coupling Animation */}
      {ecsFouling > 20 && (
        <CouplingEffect 
          startNode={nodes.zone_ecs} 
          endNode={nodes.zone_engine} 
          intensity={ecsFouling / 100}
        />
      )}
    </group>
  );
}

useGLTF.preload('/aircraft.glb');
