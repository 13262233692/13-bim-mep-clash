export interface IfcParseResult {
  model_id: number;
  entity_count: number;
  geometry_count: number;
  parse_time_ms: number;
}

export interface SweptSolidData {
  express_id: number;
  type: string;
  profile: Float32Array;
  direction: Float32Array;
  length: number;
}

export interface SpatialNode {
  express_id: number;
  name: string;
  type: string;
  children: SpatialNode[];
  bounding_box: BoundingBox | null;
}

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
}

export interface IfcWasmModule {
  parse(buffer: ArrayBuffer): IfcParseResult;
  extract_swept_solids(modelId: number): SweptSolidData[];
  extract_spatial_hierarchy(modelId: number): SpatialNode[];
  get_geometry_vertices(modelId: number, expressId: number): Float32Array;
  get_geometry_indices(modelId: number, expressId: number): Uint32Array;
  free_model(modelId: number): void;
}

export interface IFCModel {
  model_id: number;
  filename: string;
  entity_count: number;
  geometry_count: number;
  parse_time_ms: number;
}

export interface SpatialLevel {
  express_id: number;
  name: string;
  type: string;
  parent_id: number | null;
  bounding_box: BoundingBox | null;
}

export interface MepElement {
  express_id: number;
  system_type: MepSystemCategory;
  element_type: string;
  level_id: number;
  geometry_key: string;
}

export type MepSystemCategory = 'hvac' | 'cable_tray' | 'pipe';

export interface MepSystem {
  system_id: string;
  name: string;
  category: MepSystemCategory;
  color: string;
  visible: boolean;
}

export interface GeometryData {
  element_id: number;
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array | null;
}

export interface InstancedMeshData {
  geometry_key: string;
  matrices: Float32Array;
  instance_count: number;
  category: MepSystemCategory;
}

export interface InstanceData {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface VertexData {
  positions: Float32Array;
  indices: Uint32Array;
}

export interface OptimizedGeometry {
  positions: Float32Array;
  indices: Uint32Array;
  vertex_count: number;
  index_count: number;
}

export type ParseStage = 'idle' | 'reading' | 'parsing' | 'extracting' | 'converting' | 'clash_detecting' | 'ready' | 'error';

export interface ParseProgress {
  stage: ParseStage;
  percentage: number;
  message: string;
  entity_count: number;
  geometry_count: number;
  memory_mb: number;
}

export interface FlatAABB {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
}

export interface BVHNodeData {
  aabb: FlatAABB;
  leftChild: number;
  rightChild: number;
  firstPrim: number;
  primCount: number;
  isLeaf: boolean;
}

export interface BVHBuildResult {
  nodes: BVHNodeData[];
  primIndices: Int32Array;
}

export interface ClashPair {
  idA: number;
  idB: number;
  penetration: number;
  overlapMin: [number, number, number];
  overlapMax: [number, number, number];
}

export interface SectionBox {
  position: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number];
}

export interface SectionPlane {
  normal: [number, number, number];
  distance: number;
  axis: 'x' | 'y' | 'z';
}

export interface CrossSectionRing {
  elementId: number;
  category: MepSystemCategory;
  center: [number, number, number];
  outerRadius: number;
  innerRadius: number;
  points: [number, number][];
}

export interface StructuralOpening {
  elementId: number;
  center: [number, number, number];
  halfExtents: [number, number];
  normal: [number, number, number];
}

export interface ClearanceViolation {
  id: number;
  pipeId: number;
  wallId: number;
  pipeCategory: MepSystemCategory;
  sectionCenter: [number, number, number];
  sectionNormal: [number, number, number];
  pipeOuterRadius: number;
  openingHalfExtents: [number, number];
  minClearance: number;
  requiredClearance: number;
  violationAxes: ('x' | 'y')[];
  pipeRing: CrossSectionRing;
  wallOpening: StructuralOpening;
}

export interface ClearanceResult {
  violations: ClearanceViolation[];
  totalCount: number;
  criticalCount: number;
  compliantCount: number;
  checkTimeMs: number;
  sectionBox: SectionBox;
}

export type ClashSeverity = 'critical' | 'moderate' | 'minor';

export interface ClashResult {
  pairs: ClashPair[];
  totalCount: number;
  criticalCount: number;
  moderateCount: number;
  minorCount: number;
  detectionTimeMs: number;
}
