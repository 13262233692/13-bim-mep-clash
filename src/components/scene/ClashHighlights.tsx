import { useMemo } from 'react';
import * as THREE from 'three';
import type { ClashPair } from '@/types';
import { useMepClashStore } from '@/store';

interface ClashHighlightsProps {
  clashes: ClashPair[];
}

export function ClashHighlights({ clashes }: ClashHighlightsProps) {
  const showClashHighlights = useMepClashStore((s) => s.showClashHighlights);

  const clashBoxes = useMemo(() => {
    if (!showClashHighlights) return [];

    return clashes.map((clash, idx) => ({
      key: `clash_${idx}`,
      position: [
        (clash.overlapMin[0] + clash.overlapMax[0]) * 0.5,
        (clash.overlapMin[1] + clash.overlapMax[1]) * 0.5,
        (clash.overlapMin[2] + clash.overlapMax[2]) * 0.5,
      ] as [number, number, number],
      scale: [
        Math.max(0.01, clash.overlapMax[0] - clash.overlapMin[0]),
        Math.max(0.01, clash.overlapMax[1] - clash.overlapMin[1]),
        Math.max(0.01, clash.overlapMax[2] - clash.overlapMin[2]),
      ] as [number, number, number],
      severity: clash.penetration >= 0.3 ? 'critical' : clash.penetration >= 0.1 ? 'moderate' : 'minor',
    }));
  }, [clashes, showClashHighlights]);

  if (clashBoxes.length === 0) return null;

  return (
    <group>
      {clashBoxes.map(({ key, position, scale, severity }) => (
        <mesh key={key} position={position} scale={scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={severity === 'critical' ? 0xFF4444 : severity === 'moderate' ? 0xFFB020 : 0x4A9EFF}
            transparent
            opacity={0.35}
            depthWrite={false}
            side={THREE.DoubleSide}
            wireframe={severity === 'critical'}
          />
        </mesh>
      ))}
    </group>
  );
}
