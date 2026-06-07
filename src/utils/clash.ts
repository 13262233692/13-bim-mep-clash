import type { BoundingBox, ClashPair, ClashResult, ClashSeverity } from '@/types';
import type { TransferableBoundingBox, TransferableBVHNodeData, TransferableClashPair } from '@/types';
import { getWorkerPool } from '@/workers/pool';

function classifySeverity(penetration: number): ClashSeverity {
  if (penetration >= 0.3) return 'critical';
  if (penetration >= 0.1) return 'moderate';
  return 'minor';
}

export async function runClashDetection(
  boundingBoxes: Map<number, BoundingBox>
): Promise<ClashResult> {
  const startTime = performance.now();

  const boxes: TransferableBoundingBox[] = [];
  const idMapping: number[] = [];

  boundingBoxes.forEach((bbox, id) => {
    boxes.push({
      min: bbox.min,
      max: bbox.max,
      center: bbox.center,
    });
    idMapping.push(id);
  });

  const pool = getWorkerPool();

  const bvhResult = await pool.buildBVH(boxes);

  const rawClashes = await pool.detectHardClashes(
    boxes,
    bvhResult.nodes as TransferableBVHNodeData[],
    bvhResult.primIndices
  );

  const pairs: ClashPair[] = (rawClashes as TransferableClashPair[]).map((rc) => ({
    idA: idMapping[rc.idA] ?? rc.idA,
    idB: idMapping[rc.idB] ?? rc.idB,
    penetration: rc.penetration,
    overlapMin: rc.overlapMin,
    overlapMax: rc.overlapMax,
  }));

  const detectionTimeMs = performance.now() - startTime;

  let criticalCount = 0;
  let moderateCount = 0;
  let minorCount = 0;

  for (const pair of pairs) {
    const severity = classifySeverity(pair.penetration);
    if (severity === 'critical') criticalCount++;
    else if (severity === 'moderate') moderateCount++;
    else minorCount++;
  }

  return {
    pairs,
    totalCount: pairs.length,
    criticalCount,
    moderateCount,
    minorCount,
    detectionTimeMs,
  };
}
