export interface GeometryWorkerApi {
  computeInstancedMatrices(
    instances: TransferableInstanceData[],
    basePositions: Float32Array,
    baseIndices: Uint32Array
  ): Float32Array;
  computeBoundingBoxes(
    positionArrays: Float32Array[],
    indexArrays: Uint32Array[]
  ): TransferableBoundingBox[];
  optimizeVertexData(
    positions: Float32Array,
    indices: Uint32Array
  ): TransferableOptimizedGeometry;
  buildBVH(
    boxes: TransferableBoundingBox[]
  ): TransferableBVHBuildResult;
  detectHardClashes(
    boxes: TransferableBoundingBox[],
    bvhNodes: TransferableBVHNodeData[],
    primIndices: Int32Array
  ): TransferableClashPair[];
}

export interface TransferableInstanceData {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface TransferableBoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
}

export interface TransferableOptimizedGeometry {
  positions: Float32Array;
  indices: Uint32Array;
  vertex_count: number;
  index_count: number;
}

export interface TransferableFlatAABB {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
}

export interface TransferableBVHNodeData {
  aabb: TransferableFlatAABB;
  leftChild: number;
  rightChild: number;
  firstPrim: number;
  primCount: number;
  isLeaf: boolean;
}

export interface TransferableBVHBuildResult {
  nodes: TransferableBVHNodeData[];
  primIndices: Int32Array;
}

export interface TransferableClashPair {
  idA: number;
  idB: number;
  penetration: number;
  overlapMin: [number, number, number];
  overlapMax: [number, number, number];
}

export interface TransferableSectionBox {
  position: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number];
}

export interface TransferableCrossSectionRing {
  elementId: number;
  category: string;
  center: [number, number, number];
  outerRadius: number;
  innerRadius: number;
  points: [number, number][];
}

export interface TransferableStructuralOpening {
  elementId: number;
  center: [number, number, number];
  halfExtents: [number, number];
  normal: [number, number, number];
}

export interface TransferableClearanceViolation {
  id: number;
  pipeId: number;
  wallId: number;
  pipeCategory: string;
  sectionCenter: [number, number, number];
  sectionNormal: [number, number, number];
  pipeOuterRadius: number;
  openingHalfExtents: [number, number];
  minClearance: number;
  requiredClearance: number;
  violationAxes: string[];
  pipeRing: TransferableCrossSectionRing;
  wallOpening: TransferableStructuralOpening;
}

export interface TransferableClearanceResult {
  violations: TransferableClearanceViolation[];
  totalCount: number;
  criticalCount: number;
  compliantCount: number;
  checkTimeMs: number;
}
