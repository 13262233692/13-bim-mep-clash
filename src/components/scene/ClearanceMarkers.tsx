import { useMemo } from 'react';
import * as THREE from 'three';
import type { ClearanceViolation } from '@/types';

interface ClearanceMarkersProps {
  violations: ClearanceViolation[];
}

export function ClearanceMarkers({ violations }: ClearanceMarkersProps) {
  const markers = useMemo(() => {
    const result: {
      key: string;
      pipeCenter: [number, number, number];
      wallCenter: [number, number, number];
      pipeRing: { center: [number, number, number]; outerRadius: number; category: string };
      wallOpening: { center: [number, number, number]; halfExtents: [number, number] };
      sectionNormal: [number, number, number];
      minClearance: number;
      violationAxes: string[];
      isCritical: boolean;
    }[] = [];

    for (const v of violations) {
      result.push({
        key: `clearance_${v.id}`,
        pipeCenter: v.sectionCenter,
        wallCenter: v.wallOpening.center,
        pipeRing: {
          center: v.pipeRing.center,
          outerRadius: v.pipeRing.outerRadius,
          category: v.pipeCategory,
        },
        wallOpening: {
          center: v.wallOpening.center,
          halfExtents: v.wallOpening.halfExtents,
        },
        sectionNormal: v.sectionNormal,
        minClearance: v.minClearance,
        violationAxes: v.violationAxes as string[],
        isCritical: v.minClearance < 0 || v.violationAxes.length >= 2,
      });
    }

    return result;
  }, [violations]);

  if (markers.length === 0) return null;

  return (
    <group>
      {markers.map((m) => (
        <group key={m.key}>
          <PipeSectionRing center={m.pipeRing.center} radius={m.pipeRing.outerRadius} normal={m.sectionNormal} category={m.pipeRing.category} />
          <WallOpeningOutline center={m.wallOpening.center} halfExtents={m.wallOpening.halfExtents} normal={m.sectionNormal} />
          <DimensionLines
            pipeCenter={m.pipeCenter}
            wallCenter={m.wallCenter}
            pipeRadius={m.pipeRing.outerRadius}
            wallHalfExtents={m.wallOpening.halfExtents}
            normal={m.sectionNormal}
            minClearance={m.minClearance}
            violationAxes={m.violationAxes}
          />
          {m.isCritical && <ErrorMarker position={m.pipeCenter} normal={m.sectionNormal} />}
        </group>
      ))}
    </group>
  );
}

const CATEGORY_COLORS: Record<string, number> = {
  hvac: 0x4A9EFF,
  cable_tray: 0xFFB020,
  pipe: 0x00D4AA,
};

function PipeSectionRing({
  center,
  radius,
  normal,
  category,
}: {
  center: [number, number, number];
  radius: number;
  normal: [number, number, number];
  category: string;
}) {
  const geometry = useMemo(() => {
    const segments = 32;
    const pts: THREE.Vector3[] = [];
    const [nx, ny, nz] = normal;
    let up: THREE.Vector3;
    if (Math.abs(ny) > 0.9) {
      up = new THREE.Vector3(1, 0, 0);
    } else {
      up = new THREE.Vector3(0, 1, 0);
    }
    const n = new THREE.Vector3(nx, ny, nz).normalize();
    const right = new THREE.Vector3().crossVectors(up, n).normalize();
    const correctedUp = new THREE.Vector3().crossVectors(n, right).normalize();

    for (let i = 0; i <= segments; i++) {
      const angle = (2 * Math.PI * i) / segments;
      const x = center[0] + radius * (Math.cos(angle) * right.x + Math.sin(angle) * correctedUp.x);
      const y = center[1] + radius * (Math.cos(angle) * right.y + Math.sin(angle) * correctedUp.y);
      const z = center[2] + radius * (Math.cos(angle) * right.z + Math.sin(angle) * correctedUp.z);
      pts.push(new THREE.Vector3(x, y, z));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return geo;
  }, [center, radius, normal]);

  const color = CATEGORY_COLORS[category] ?? 0x00D4AA;

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={color} linewidth={2} transparent opacity={0.9} />
    </lineLoop>
  );
}

function WallOpeningOutline({
  center,
  halfExtents,
  normal,
}: {
  center: [number, number, number];
  halfExtents: [number, number];
  normal: [number, number, number];
}) {
  const geometry = useMemo(() => {
    const [hx, hy] = halfExtents;
    const [nx, ny, nz] = normal;
    let right: THREE.Vector3;
    let up: THREE.Vector3;

    if (Math.abs(nz) > 0.9) {
      right = new THREE.Vector3(1, 0, 0);
      up = new THREE.Vector3(0, 1, 0);
    } else if (Math.abs(nx) > 0.9) {
      right = new THREE.Vector3(0, 0, 1);
      up = new THREE.Vector3(0, 1, 0);
    } else {
      right = new THREE.Vector3(1, 0, 0);
      up = new THREE.Vector3(0, 0, 1);
    }

    const c = new THREE.Vector3(...center);
    const corners = [
      c.clone().add(right.clone().multiplyScalar(hx)).add(up.clone().multiplyScalar(hy)),
      c.clone().add(right.clone().multiplyScalar(hx)).sub(up.clone().multiplyScalar(hy)),
      c.clone().sub(right.clone().multiplyScalar(hx)).sub(up.clone().multiplyScalar(hy)),
      c.clone().sub(right.clone().multiplyScalar(hx)).add(up.clone().multiplyScalar(hy)),
    ];

    return new THREE.BufferGeometry().setFromPoints(corners);
  }, [center, halfExtents, normal]);

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={0xFFB020} linewidth={2} transparent opacity={0.7} />
    </lineLoop>
  );
}

function DimensionLines({
  pipeCenter,
  wallCenter,
  pipeRadius,
  wallHalfExtents,
  normal,
  minClearance,
  violationAxes,
}: {
  pipeCenter: [number, number, number];
  wallCenter: [number, number, number];
  pipeRadius: number;
  wallHalfExtents: [number, number];
  normal: [number, number, number];
  minClearance: number;
  violationAxes: string[];
}) {
  const geometries = useMemo(() => {
    const result: { geo: THREE.BufferGeometry; isViolation: boolean }[] = [];
    const [nx, ny, nz] = normal;

    let right: THREE.Vector3;
    let up: THREE.Vector3;

    if (Math.abs(nz) > 0.9) {
      right = new THREE.Vector3(1, 0, 0);
      up = new THREE.Vector3(0, 1, 0);
    } else if (Math.abs(nx) > 0.9) {
      right = new THREE.Vector3(0, 0, 1);
      up = new THREE.Vector3(0, 1, 0);
    } else {
      right = new THREE.Vector3(1, 0, 0);
      up = new THREE.Vector3(0, 0, 1);
    }

    const pc = new THREE.Vector3(...pipeCenter);
    const wc = new THREE.Vector3(...wallCenter);

    const pipeEdgeR = pc.clone().add(right.clone().multiplyScalar(pipeRadius));
    const wallEdgeR = wc.clone().add(right.clone().multiplyScalar(wallHalfExtents[0]));
    result.push({
      geo: new THREE.BufferGeometry().setFromPoints([pipeEdgeR, wallEdgeR]),
      isViolation: violationAxes.includes('x'),
    });

    const pipeEdgeU = pc.clone().add(up.clone().multiplyScalar(pipeRadius));
    const wallEdgeU = wc.clone().add(up.clone().multiplyScalar(wallHalfExtents[1]));
    result.push({
      geo: new THREE.BufferGeometry().setFromPoints([pipeEdgeU, wallEdgeU]),
      isViolation: violationAxes.includes('y'),
    });

    return result;
  }, [pipeCenter, wallCenter, pipeRadius, wallHalfExtents, normal, violationAxes]);

  void minClearance;

  return (
    <group>
      {geometries.map((item, i) => (
        <lineSegments key={i} geometry={item.geo}>
          <lineBasicMaterial
            color={item.isViolation ? 0xFF4444 : 0x00D4AA}
            linewidth={2}
            transparent
            opacity={0.9}
          />
        </lineSegments>
      ))}
    </group>
  );
}

function ErrorMarker({
  position,
  normal,
}: {
  position: [number, number, number];
  normal: [number, number, number];
}) {
  const offset: [number, number, number] = [
    position[0] + normal[0] * 0.1,
    position[1] + normal[1] * 0.1 + 0.5,
    position[2] + normal[2] * 0.1,
  ];

  const connectorGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...position),
      new THREE.Vector3(...offset),
    ]);
  }, [position, offset]);

  return (
    <group>
      <mesh position={offset}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color={0xFF4444} transparent opacity={0.9} />
      </mesh>
      <mesh position={position}>
        <octahedronGeometry args={[0.08, 0]} />
        <meshBasicMaterial color={0xFF4444} />
      </mesh>
      <lineSegments geometry={connectorGeo}>
        <lineBasicMaterial color={0xFF4444} linewidth={1} />
      </lineSegments>
    </group>
  );
}
