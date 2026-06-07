import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { InstancedMeshData, GeometryData } from '@/types';
import { createBufferGeometryFromData, createSolidMaterial, createXrayMaterial } from '@/utils/geometry';
import { useMepClashStore } from '@/store';

interface SimpleGeometry {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array | null;
}

interface MepInstancedMeshProps {
  meshData: InstancedMeshData;
  geometryData: SimpleGeometry;
}

export function MepInstancedMesh({ meshData, geometryData }: MepInstancedMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const xrayMode = useMepClashStore((s) => s.xrayMode);
  const opacity = useMepClashStore((s) => s.opacity);

  const geoInput: GeometryData = useMemo(() => ({
    element_id: 0,
    positions: geometryData.positions,
    indices: geometryData.indices,
    normals: geometryData.normals,
  }), [geometryData]);

  const geometry = useMemo(() => createBufferGeometryFromData(geoInput), [geoInput]);

  const solidMaterial = useMemo(() => createSolidMaterial(meshData.category), [meshData.category]);

  const xrayMaterial = useMemo(() => createXrayMaterial(meshData.category, opacity), [meshData.category, opacity]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useMemo(() => {
    if (!meshRef.current) return;
    const matrices = meshData.matrices;
    for (let i = 0; i < meshData.instance_count; i++) {
      const offset = i * 16;
      dummy.matrix.fromArray(matrices, offset);
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [meshData, dummy]);

  useFrame(() => {
    if (!meshRef.current) return;
    if (xrayMode && xrayMaterial.opacity !== opacity) {
      xrayMaterial.opacity = opacity;
      xrayMaterial.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, xrayMode ? xrayMaterial : solidMaterial, meshData.instance_count]}
      frustumCulled={false}
    />
  );
}

interface MepSceneProps {
  geometries: Map<number, SimpleGeometry>;
  instances: Map<string, InstancedMeshData>;
}

export function MepScene({ geometries, instances }: MepSceneProps) {
  const selectedSystemIds = useMepClashStore((s) => s.selectedSystemIds);
  const selectedLevelId = useMepClashStore((s) => s.selectedLevelId);
  const spatialLevels = useMepClashStore((s) => s.spatialLevels);
  const mepElements = useMepClashStore((s) => s.mepElements);

  const levelElementIds = useMemo(() => {
    if (selectedLevelId === null) return null;
    const ids = new Set<number>();
    for (const el of mepElements) {
      if (el.level_id === selectedLevelId) ids.add(el.express_id);
    }
    return ids;
  }, [selectedLevelId, mepElements]);

  void levelElementIds;

  const visibleInstances = useMemo(() => {
    const result: { key: string; data: InstancedMeshData; geo: SimpleGeometry }[] = [];

    for (const [key, inst] of instances) {
      if (!selectedSystemIds.includes(inst.category)) continue;

      let geoData: SimpleGeometry | undefined;
      for (const [, geo] of geometries) {
        geoData = geo;
        break;
      }

      if (!geoData) continue;
      result.push({ key, data: inst, geo: geoData });
    }

    return result;
  }, [instances, geometries, selectedSystemIds]);

  return (
    <group>
      {visibleInstances.map(({ key, data, geo }) => (
        <MepInstancedMesh key={key} meshData={data} geometryData={geo} />
      ))}
    </group>
  );
}
