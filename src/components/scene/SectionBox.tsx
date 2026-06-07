import { useRef, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMepClashStore } from '@/store';

const CLIPPING_PLANE_CONFIGS = [
  { normal: new THREE.Vector3(1, 0, 0), sign: 1 },
  { normal: new THREE.Vector3(-1, 0, 0), sign: 1 },
  { normal: new THREE.Vector3(0, 1, 0), sign: 1 },
  { normal: new THREE.Vector3(0, -1, 0), sign: 1 },
  { normal: new THREE.Vector3(0, 0, 1), sign: 1 },
  { normal: new THREE.Vector3(0, 0, -1), sign: 1 },
];

export function SectionBoxClippingPlanes() {
  const sectionBoxActive = useMepClashStore((s) => s.sectionBoxActive);
  const sectionBox = useMepClashStore((s) => s.sectionBox);
  const { gl } = useThree();

  useEffect(() => {
    if (!sectionBoxActive) {
      gl.clippingPlanes = [];
      gl.localClippingEnabled = false;
      return;
    }

    const planes: THREE.Plane[] = [];

    const px = sectionBox.position[0];
    const py = sectionBox.position[1];
    const pz = sectionBox.position[2];
    const hx = sectionBox.size[0] * 0.5;
    const hy = sectionBox.size[1] * 0.5;
    const hz = sectionBox.size[2] * 0.5;

    planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), px + hx));
    planes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), -(px - hx)));
    planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), py + hy));
    planes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), -(py - hy)));
    planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), pz + hz));
    planes.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), -(pz - hz)));

    gl.clippingPlanes = planes;
    gl.localClippingEnabled = true;

    return () => {
      gl.clippingPlanes = [];
      gl.localClippingEnabled = false;
    };
  }, [sectionBoxActive, sectionBox, gl]);

  return null;
}

export function SectionBoxVisual() {
  const sectionBoxActive = useMepClashStore((s) => s.sectionBoxActive);
  const sectionBox = useMepClashStore((s) => s.sectionBox);
  const setSectionBox = useMepClashStore((s) => s.setSectionBox);
  const meshRef = useRef<THREE.Mesh>(null);
  const transformRef = useRef<any>(null);

  const handleObjectChange = useCallback(() => {
    if (!meshRef.current) return;
    const obj = meshRef.current;
    obj.updateMatrixWorld(true);

    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    obj.matrixWorld.decompose(pos, quat, scl);

    const euler = new THREE.Euler().setFromQuaternion(quat);

    setSectionBox({
      position: [pos.x, pos.y, pos.z],
      size: [
        Math.max(1, scl.x * 1),
        Math.max(1, scl.y * 1),
        Math.max(1, scl.z * 1),
      ],
      rotation: [euler.x, euler.y, euler.z],
    });
  }, [setSectionBox]);

  if (!sectionBoxActive) return null;

  return (
    <group>
      <TransformControls
        ref={transformRef}
        object={meshRef}
        mode="translate"
        size={0.6}
        onObjectChange={handleObjectChange}
      />
      <mesh
        ref={meshRef}
        position={sectionBox.position}
        scale={sectionBox.size}
        rotation={sectionBox.rotation}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={0x00D4AA}
          transparent
          opacity={0.04}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <SectionBoxEdges sectionBox={sectionBox} />
    </group>
  );
}

function SectionBoxEdges({ sectionBox }: { sectionBox: { position: [number, number, number]; size: [number, number, number]; rotation: [number, number, number] } }) {
  const { position, size, rotation } = sectionBox;
  const geometry = useMemo(() => {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    return geo;
  }, []);

  void rotation;

  return (
    <lineSegments
      position={position}
      scale={size}
      rotation={rotation}
      geometry={geometry}
    >
      <lineBasicMaterial color={0x00D4AA} transparent opacity={0.6} />
    </lineSegments>
  );
}

import { useMemo } from 'react';

export { CLIPPING_PLANE_CONFIGS };
