import { useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Stats } from '@react-three/drei';
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MepScene } from './MepScene';
import { useMepClashStore } from '@/store';
import type { InstancedMeshData } from '@/types';

type SimpleGeometry = { positions: Float32Array; indices: Uint32Array; normals: Float32Array | null };

function SceneSetup() {
  const { camera } = useThree();
  const initialized = useRef(false);

  if (!initialized.current) {
    camera.position.set(30, 25, 30);
    camera.lookAt(0, 0, 0);
    initialized.current = true;
  }

  return null;
}

function SceneLighting() {
  return (
    <>
      <hemisphereLight
        args={['#4A9EFF', '#0D1117', 0.6]}
      />
      <directionalLight
        position={[20, 30, 15]}
        intensity={1.2}
        color="#FFF5E6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <ambientLight intensity={0.15} />
    </>
  );
}

function SceneGround() {
  return (
    <Grid
      args={[100, 100]}
      cellSize={1}
      cellThickness={0.5}
      cellColor="#1C2333"
      sectionSize={10}
      sectionThickness={1}
      sectionColor="#2D3548"
      fadeDistance={80}
      fadeStrength={1}
      infiniteGrid
      position={[0, 0, 0]}
    />
  );
}

interface ViewerCanvasProps {
  geometries: Map<number, SimpleGeometry>;
  instances: Map<string, InstancedMeshData>;
}

export function ViewerCanvas({ geometries, instances }: ViewerCanvasProps) {
  const xrayMode = useMepClashStore((s) => s.xrayMode);

  return (
    <Canvas
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      camera={{ fov: 60, near: 0.1, far: 500 }}
      shadows
      dpr={[1, 2]}
      style={{ background: '#0D1117' }}
    >
      <SceneSetup />
      <SceneLighting />
      <SceneGround />

      <MepScene geometries={geometries} instances={instances} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={200}
        maxPolarAngle={Math.PI * 0.85}
      />

      <Environment preset="night" background={false} />

      {xrayMode && (
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.6}
            luminanceSmoothing={0.4}
            intensity={0.8}
          />
          <SSAO
            radius={0.5}
            intensity={15}
            luminanceInfluence={0.5}
            color={new THREE.Color('#0D1117')}
            worldDistanceThreshold={0.5}
            worldDistanceFalloff={0.01}
            worldProximityThreshold={0.5}
            worldProximityFalloff={0.01}
          />
        </EffectComposer>
      )}

      <Stats />
    </Canvas>
  );
}
