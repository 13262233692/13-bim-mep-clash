import type { BoundingBox, SectionBox, ClearanceResult, ClearanceViolation, CrossSectionRing, StructuralOpening, MepSystemCategory } from '@/types';
import type { TransferableBoundingBox, TransferableSectionBox, TransferableClearanceResult, TransferableClearanceViolation } from '@/types';
import { getWorkerPool } from '@/workers/pool';

export async function runClearanceCheck(
  boundingBoxes: Map<number, BoundingBox>,
  mepElements: { express_id: number; system_type: MepSystemCategory; element_type: string }[],
  sectionBox: SectionBox
): Promise<ClearanceResult> {
  const boxes: TransferableBoundingBox[] = [];
  const categories: { id: number; category: string; elementType: string }[] = [];

  boundingBoxes.forEach((bbox, id) => {
    boxes.push({
      min: bbox.min,
      max: bbox.max,
      center: bbox.center,
    });

    const mepEl = mepElements.find((e) => e.express_id === id);
    categories.push({
      id: boxes.length - 1,
      category: mepEl?.system_type ?? 'pipe',
      elementType: mepEl?.element_type ?? 'unknown',
    });
  });

  const transferableSectionBox: TransferableSectionBox = {
    position: sectionBox.position,
    size: sectionBox.size,
    rotation: sectionBox.rotation,
  };

  const pool = getWorkerPool();
  const rawResult = await pool.checkClearance(boxes, categories, transferableSectionBox);

  return mapClearanceResult(rawResult, sectionBox);
}

function mapClearanceResult(
  raw: TransferableClearanceResult,
  sectionBox: SectionBox
): ClearanceResult {
  const violations: ClearanceViolation[] = raw.violations.map(mapViolation);

  return {
    violations,
    totalCount: raw.totalCount,
    criticalCount: raw.criticalCount,
    compliantCount: raw.compliantCount,
    checkTimeMs: raw.checkTimeMs,
    sectionBox,
  };
}

function mapViolation(v: TransferableClearanceViolation): ClearanceViolation {
  return {
    id: v.id,
    pipeId: v.pipeId,
    wallId: v.wallId,
    pipeCategory: v.pipeCategory as MepSystemCategory,
    sectionCenter: v.sectionCenter,
    sectionNormal: v.sectionNormal,
    pipeOuterRadius: v.pipeOuterRadius,
    openingHalfExtents: v.openingHalfExtents,
    minClearance: v.minClearance,
    requiredClearance: v.requiredClearance,
    violationAxes: v.violationAxes as ('x' | 'y')[],
    pipeRing: mapRing(v.pipeRing),
    wallOpening: mapOpening(v.wallOpening),
  };
}

function mapRing(r: TransferableCrossSectionRing): CrossSectionRing {
  return {
    elementId: r.elementId,
    category: r.category as MepSystemCategory,
    center: r.center,
    outerRadius: r.outerRadius,
    innerRadius: r.innerRadius,
    points: r.points,
  };
}

function mapOpening(o: TransferableStructuralOpening): StructuralOpening {
  return {
    elementId: o.elementId,
    center: o.center,
    halfExtents: o.halfExtents,
    normal: o.normal,
  };
}

interface TransferableCrossSectionRing {
  elementId: number;
  category: string;
  center: [number, number, number];
  outerRadius: number;
  innerRadius: number;
  points: [number, number][];
}

interface TransferableStructuralOpening {
  elementId: number;
  center: [number, number, number];
  halfExtents: [number, number];
  normal: [number, number, number];
}
