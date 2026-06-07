import * as THREE from 'three';
import type { MepElement, MepSystemCategory, GeometryData, InstancedMeshData, BoundingBox } from '@/types';

const SYSTEM_COLORS: Record<MepSystemCategory, number> = {
  hvac: 0x4A9EFF,
  cable_tray: 0xFFB020,
  pipe: 0x00D4AA,
};

export function buildInstancedMeshes(
  elements: MepElement[],
  geometries: Map<number, GeometryData>,
  boundingBoxes: Map<number, BoundingBox>
): Map<string, InstancedMeshData> {
  const groupMap = new Map<string, { elements: MepElement[]; category: MepSystemCategory }>();

  for (const el of elements) {
    if (!groupMap.has(el.geometry_key)) {
      groupMap.set(el.geometry_key, { elements: [], category: el.system_type });
    }
    groupMap.get(el.geometry_key)!.elements.push(el);
  }

  const instanceMap = new Map<string, InstancedMeshData>();

  for (const [key, group] of groupMap) {
    const firstElement = group.elements[0];
    const geo = geometries.get(firstElement.express_id);
    if (!geo) continue;

    const matrices = new Float32Array(group.elements.length * 16);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < group.elements.length; i++) {
      const el = group.elements[i];
      const bbox = boundingBoxes.get(el.express_id);

      if (bbox) {
        dummy.position.set(bbox.center[0], bbox.center[1], bbox.center[2]);
      } else {
        dummy.position.set(
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10
        );
      }
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      matrices.set(dummy.matrix.elements, i * 16);
    }

    instanceMap.set(key, {
      geometry_key: key,
      matrices,
      instance_count: group.elements.length,
      category: group.category,
    });
  }

  return instanceMap;
}

export function createBufferGeometryFromData(data: GeometryData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));

  if (data.normals) {
    geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  } else {
    geometry.computeVertexNormals();
  }

  return geometry;
}

export function getSystemColor(category: MepSystemCategory): number {
  return SYSTEM_COLORS[category];
}

export function createXrayMaterial(category: MepSystemCategory, opacity: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: SYSTEM_COLORS[category],
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.2,
    metalness: 0.1,
    transmission: 0.3,
    emissive: SYSTEM_COLORS[category],
    emissiveIntensity: 0.15,
  });
}

export function createSolidMaterial(category: MepSystemCategory): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: SYSTEM_COLORS[category],
    roughness: 0.5,
    metalness: 0.3,
    side: THREE.DoubleSide,
  });
}
