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

interface FlatAABB {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
}

interface BVHNodeData {
  aabb: FlatAABB;
  leftChild: number;
  rightChild: number;
  firstPrim: number;
  primCount: number;
  isLeaf: boolean;
}

interface TransferableClashPair {
  idA: number;
  idB: number;
  penetration: number;
  overlapMin: [number, number, number];
  overlapMax: [number, number, number];
}

interface StackFrame {
  nodeIdx: number;
  start: number;
  end: number;
  depth: number;
}

const SAH_TRAVERSAL_COST = 1.0;
const SAH_INTERSECTION_COST = 1.5;
const SAH_EMPTY_BONUS = 0.2;
const MAX_BVH_DEPTH = 64;
const MIN_LEAF_PRIMS = 2;

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

function surfaceArea(aabb: FlatAABB): number {
  const dx = aabb.maxX - aabb.minX;
  const dy = aabb.maxY - aabb.minY;
  const dz = aabb.maxZ - aabb.minZ;
  return 2.0 * (dx * dy + dy * dz + dz * dx);
}

function mergeAABB(a: FlatAABB, b: FlatAABB): FlatAABB {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    minZ: Math.min(a.minZ, b.minZ),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
    maxZ: Math.max(a.maxZ, b.maxZ),
  };
}

function aabbFromBox(box: TransferableBoundingBox): FlatAABB {
  return {
    minX: box.min[0], minY: box.min[1], minZ: box.min[2],
    maxX: box.max[0], maxY: box.max[1], maxZ: box.max[2],
  };
}

function emptyAABB(): FlatAABB {
  return {
    minX: Infinity, minY: Infinity, minZ: Infinity,
    maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity,
  };
}

function computeCentroid(box: TransferableBoundingBox): [number, number, number] {
  return [
    (box.min[0] + box.max[0]) * 0.5,
    (box.min[1] + box.max[1]) * 0.5,
    (box.min[2] + box.max[2]) * 0.5,
  ];
}

function findBestSAHSplit(
  boxes: TransferableBoundingBox[],
  indices: Int32Array | number[],
  start: number,
  end: number,
  parentArea: number
): { axis: number; pos: number; cost: number } {
  let bestAxis = -1;
  let bestPos = 0;
  let bestCost = Infinity;

  for (let axis = 0; axis < 3; axis++) {
    const buckets = 16;
    const bucketMins: FlatAABB[] = [];
    const bucketMaxs: FlatAABB[] = [];
    const bucketCounts = new Int32Array(buckets);

    let centroidMin = Infinity;
    let centroidMax = -Infinity;

    for (let i = start; i < end; i++) {
      const c = computeCentroid(boxes[indices[i]]);
      const val = c[axis];
      if (val < centroidMin) centroidMin = val;
      if (val > centroidMax) centroidMax = val;
    }

    if (centroidMin >= centroidMax) continue;

    const invExtent = buckets / (centroidMax - centroidMin);

    for (let b = 0; b < buckets; b++) {
      bucketMins.push(emptyAABB());
      bucketMaxs.push(emptyAABB());
    }

    for (let i = start; i < end; i++) {
      const c = computeCentroid(boxes[indices[i]]);
      let b = Math.floor((c[axis] - centroidMin) * invExtent);
      if (b >= buckets) b = buckets - 1;
      if (b < 0) b = 0;

      const primAABB = aabbFromBox(boxes[indices[i]]);
      bucketMins[b] = mergeAABB(bucketMins[b], primAABB);
      bucketMaxs[b] = mergeAABB(bucketMaxs[b], primAABB);
      bucketCounts[b]++;
    }

    const leftAreas = new Float64Array(buckets);
    const rightAreas = new Float64Array(buckets);
    const leftCounts = new Int32Array(buckets);
    const rightCounts = new Int32Array(buckets);

    let leftAccum = emptyAABB();
    let leftCount = 0;
    for (let b = 0; b < buckets; b++) {
      leftAccum = mergeAABB(leftAccum, bucketMins[b]);
      leftCount += bucketCounts[b];
      leftAreas[b] = surfaceArea(leftAccum);
      leftCounts[b] = leftCount;
    }

    let rightAccum = emptyAABB();
    let rightCount = 0;
    for (let b = buckets - 1; b >= 0; b--) {
      rightAccum = mergeAABB(rightAccum, bucketMins[b]);
      rightCount += bucketCounts[b];
      rightAreas[b] = surfaceArea(rightAccum);
      rightCounts[b] = rightCount;
    }

    for (let b = 1; b < buckets; b++) {
      const nLeft = leftCounts[b - 1];
      const nRight = rightCounts[b];
      if (nLeft === 0 || nRight === 0) continue;

      const cost = SAH_TRAVERSAL_COST +
        (leftAreas[b - 1] / parentArea) * nLeft * SAH_INTERSECTION_COST +
        (rightAreas[b] / parentArea) * nRight * SAH_INTERSECTION_COST;

      if (cost < bestCost) {
        bestCost = cost;
        bestAxis = axis;
        bestPos = centroidMin + (b / buckets) * (centroidMax - centroidMin);
      }
    }
  }

  return { axis: bestAxis, pos: bestPos, cost: bestCost };
}

function buildBVHWithSAH(boxes: TransferableBoundingBox[]): BVHNodeData[] {
  const n = boxes.length;
  if (n === 0) return [];

  const indices = new Int32Array(n);
  for (let i = 0; i < n; i++) indices[i] = i;

  const nodes: BVHNodeData[] = [];
  let nodeCount = 0;

  const stack: StackFrame[] = [];
  stack.push({ nodeIdx: 0, start: 0, end: n, depth: 0 });
  nodes.push(createEmptyNode());
  nodeCount++;

  while (stack.length > 0) {
    const frame = stack.pop()!;
    const { start, end, depth } = frame;
    const count = end - start;

    let nodeAABB = emptyAABB();
    for (let i = start; i < end; i++) {
      nodeAABB = mergeAABB(nodeAABB, aabbFromBox(boxes[indices[i]]));
    }

    const parentArea = surfaceArea(nodeAABB);
    const leafCost = count * SAH_INTERSECTION_COST;

    let shouldMakeLeaf = count <= MIN_LEAF_PRIMS || depth >= MAX_BVH_DEPTH;

    let splitAxis = -1;
    let splitPos = 0;

    if (!shouldMakeLeaf) {
      const split = findBestSAHSplit(boxes, indices, start, end, parentArea);

      if (split.axis >= 0 && split.cost < leafCost) {
        splitAxis = split.axis;
        splitPos = split.pos;
      } else {
        shouldMakeLeaf = true;
      }
    }

    if (shouldMakeLeaf) {
      nodes[frame.nodeIdx] = {
        aabb: nodeAABB,
        leftChild: -1,
        rightChild: -1,
        firstPrim: start,
        primCount: count,
        isLeaf: true,
      };
      continue;
    }

    let leftEnd = start;
    for (let i = start; i < end; i++) {
      const c = computeCentroid(boxes[indices[i]]);
      if (c[splitAxis] < splitPos) {
        const tmp = indices[i];
        indices[i] = indices[leftEnd];
        indices[leftEnd] = tmp;
        leftEnd++;
      }
    }

    if (leftEnd === start || leftEnd === end) {
      const mid = (start + end) >> 1;
      const sortable: number[] = [];
      for (let i = start; i < end; i++) sortable.push(indices[i]);
      sortable.sort((a, b) => {
        const ca = computeCentroid(boxes[a]);
        const cb = computeCentroid(boxes[b]);
        return ca[splitAxis] - cb[splitAxis];
      });
      for (let i = 0; i < sortable.length; i++) {
        indices[start + i] = sortable[i];
      }
      leftEnd = start + (count >> 1);
    }

    const leftIdx = nodeCount++;
    nodes.push(createEmptyNode());
    const rightIdx = nodeCount++;
    nodes.push(createEmptyNode());

    nodes[frame.nodeIdx] = {
      aabb: nodeAABB,
      leftChild: leftIdx,
      rightChild: rightIdx,
      firstPrim: -1,
      primCount: 0,
      isLeaf: false,
    };

    stack.push({ nodeIdx: rightIdx, start: leftEnd, end, depth: depth + 1 });
    stack.push({ nodeIdx: leftIdx, start, end: leftEnd, depth: depth + 1 });
  }

  return nodes;
}

function createEmptyNode(): BVHNodeData {
  return {
    aabb: emptyAABB(),
    leftChild: -1,
    rightChild: -1,
    firstPrim: -1,
    primCount: 0,
    isLeaf: true,
  };
}

function aabbOverlap(a: FlatAABB, b: FlatAABB): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX &&
    a.minY <= b.maxY && a.maxY >= b.minY &&
    a.minZ <= b.maxZ && a.maxZ >= b.minZ
  );
}

function aabbIntersection(a: FlatAABB, b: FlatAABB): FlatAABB {
  return {
    minX: Math.max(a.minX, b.minX),
    minY: Math.max(a.minY, b.minY),
    minZ: Math.max(a.minZ, b.minZ),
    maxX: Math.min(a.maxX, b.maxX),
    maxY: Math.min(a.maxY, b.maxY),
    maxZ: Math.min(a.maxZ, b.maxZ),
  };
}

function penetrationDepth(overlap: FlatAABB): number {
  const dx = overlap.maxX - overlap.minX;
  const dy = overlap.maxY - overlap.minY;
  const dz = overlap.maxZ - overlap.minZ;
  return Math.min(dx, Math.min(dy, dz));
}

function detectHardClashes(
  boxes: TransferableBoundingBox[],
  bvh: BVHNodeData[],
  primIndices: Int32Array
): TransferableClashPair[] {
  const clashes: TransferableClashPair[] = [];
  const n = boxes.length;
  if (n < 2 || bvh.length === 0) return clashes;

  for (let i = 0; i < n; i++) {
    const queryAABB = aabbFromBox(boxes[i]);

    const stack: number[] = [0];

    while (stack.length > 0) {
      const nodeIdx = stack.pop()!;
      const node = bvh[nodeIdx];

      if (!aabbOverlap(queryAABB, node.aabb)) continue;

      if (node.isLeaf) {
        for (let j = node.firstPrim; j < node.firstPrim + node.primCount; j++) {
          const primIdx = primIndices[j];
          if (primIdx <= i) continue;

          const primAABB = aabbFromBox(boxes[primIdx]);
          if (!aabbOverlap(queryAABB, primAABB)) continue;

          const overlap = aabbIntersection(queryAABB, primAABB);
          const pen = penetrationDepth(overlap);
          if (pen <= 0) continue;

          clashes.push({
            idA: i,
            idB: primIdx,
            penetration: pen,
            overlapMin: [overlap.minX, overlap.minY, overlap.minZ],
            overlapMax: [overlap.maxX, overlap.maxY, overlap.maxZ],
          });
        }
      } else {
        stack.push(node.leftChild);
        stack.push(node.rightChild);
      }
    }
  }

  return clashes;
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
      case 'buildBVH': {
        const { boxes } = payload as { boxes: TransferableBoundingBox[] };
        const bvh = buildBVHWithSAH(boxes);
        const primIndices = new Int32Array(boxes.length);
        for (let i = 0; i < boxes.length; i++) primIndices[i] = i;
        result = { nodes: bvh, primIndices };
        break;
      }
      case 'detectHardClashes': {
        const { boxes, bvhNodes, primIndices } = payload as {
          boxes: TransferableBoundingBox[];
          bvhNodes: BVHNodeData[];
          primIndices: Int32Array;
        };
        result = detectHardClashes(boxes, bvhNodes, primIndices);
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
