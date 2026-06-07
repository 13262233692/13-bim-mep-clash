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
