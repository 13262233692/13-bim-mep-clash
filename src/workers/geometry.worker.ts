interface TransferableInstanceData {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

interface TransferableBoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
}

interface TransferableOptimizedGeometry {
  positions: Float32Array;
  indices: Uint32Array;
  vertex_count: number;
  index_count: number;
}

function computeInstancedMatrices(
  instances: TransferableInstanceData[],
  basePositions: Float32Array,
  baseIndices: Uint32Array
): Float32Array {
  const matrixCount = instances.length;
  const matrices = new Float32Array(matrixCount * 16);

  for (let i = 0; i < matrixCount; i++) {
    const inst = instances[i];
    const offset = i * 16;
    const m = composeMatrix(inst.position, inst.rotation, inst.scale);
    matrices.set(m, offset);
  }

  void basePositions;
  void baseIndices;
  return matrices;
}

function composeMatrix(
  pos: [number, number, number],
  rot: [number, number, number],
  scl: [number, number, number]
): Float32Array {
  const cx = Math.cos(rot[0]), sx = Math.sin(rot[0]);
  const cy = Math.cos(rot[1]), sy = Math.sin(rot[1]);
  const cz = Math.cos(rot[2]), sz = Math.sin(rot[2]);

  const m = new Float32Array(16);

  m[0] = (cy * cz) * scl[0];
  m[1] = (cy * sz) * scl[0];
  m[2] = -sy * scl[0];
  m[3] = 0;

  m[4] = (sx * sy * cz - cx * sz) * scl[1];
  m[5] = (sx * sy * sz + cx * cz) * scl[1];
  m[6] = (sx * cy) * scl[1];
  m[7] = 0;

  m[8] = (cx * sy * cz + sx * sz) * scl[2];
  m[9] = (cx * sy * sz - sx * cz) * scl[2];
  m[10] = (cx * cy) * scl[2];
  m[11] = 0;

  m[12] = pos[0];
  m[13] = pos[1];
  m[14] = pos[2];
  m[15] = 1;

  return m;
}

function computeBoundingBoxes(
  positionArrays: Float32Array[],
  _indexArrays: Uint32Array[]
): TransferableBoundingBox[] {
  return positionArrays.map((positions) => {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }

    return {
      min: [minX, minY, minZ] as [number, number, number],
      max: [maxX, maxY, maxZ] as [number, number, number],
      center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2] as [number, number, number],
    };
  });
}

function optimizeVertexData(
  positions: Float32Array,
  indices: Uint32Array
): TransferableOptimizedGeometry {
  return {
    positions,
    indices,
    vertex_count: positions.length / 3,
    index_count: indices.length,
  };
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    let result: unknown;
    switch (type) {
      case 'computeInstancedMatrices': {
        const { instances, basePositions, baseIndices } = payload;
        result = computeInstancedMatrices(instances, basePositions, baseIndices);
        break;
      }
      case 'computeBoundingBoxes': {
        const { positionArrays, indexArrays } = payload;
        result = computeBoundingBoxes(positionArrays, indexArrays);
        break;
      }
      case 'optimizeVertexData': {
        const { positions, indices } = payload;
        result = optimizeVertexData(positions, indices);
        break;
      }
      default:
        throw new Error(`Unknown worker command: ${type}`);
    }

    self.postMessage({ type: 'result', id, payload: result });
  } catch (err) {
    self.postMessage({
      type: 'error',
      id,
      payload: err instanceof Error ? err.message : String(err),
    });
  }
};
