import type { TransferableInstanceData, TransferableBoundingBox, TransferableOptimizedGeometry } from '@/types';

type WorkerCommand = 'computeInstancedMatrices' | 'computeBoundingBoxes' | 'optimizeVertexData';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

class GeometryWorkerPool {
  private workers: Worker[] = [];
  private pending: Map<number, PendingRequest> = new Map();
  private requestId = 0;
  private nextWorker = 0;
  private busyWorkers: Set<number> = new Set();

  constructor(poolSize: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(
        new URL('./geometry.worker.ts', import.meta.url),
        { type: 'module' }
      );
      worker.onmessage = this.handleMessage.bind(this);
      this.workers.push(worker);
    }
  }

  private handleMessage(e: MessageEvent) {
    const { type, id, payload } = e.data;
    const pending = this.pending.get(id);
    if (!pending) return;

    this.pending.delete(id);
    const workerIndex = this.workers.indexOf(e.target as Worker);
    this.busyWorkers.delete(workerIndex);

    if (type === 'error') {
      pending.reject(new Error(payload));
    } else {
      pending.resolve(payload);
    }
  }

  private dispatch<T>(command: WorkerCommand, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });

      const workerIdx = this.selectWorker();
      const worker = this.workers[workerIdx];
      this.busyWorkers.add(workerIdx);
      worker.postMessage({ type: command, payload, id }, this.getTransferables(payload));
    });
  }

  private selectWorker(): number {
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.busyWorkers.has(i)) return i;
    }
    this.nextWorker = (this.nextWorker + 1) % this.workers.length;
    return this.nextWorker;
  }

  private getTransferables(payload: unknown): Transferable[] {
    const transferables: Transferable[] = [];
    if (payload && typeof payload === 'object') {
      for (const value of Object.values(payload as Record<string, unknown>)) {
        if (value instanceof Float32Array || value instanceof Uint32Array) {
          transferables.push(value.buffer as Transferable);
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item instanceof Float32Array || item instanceof Uint32Array) {
              transferables.push(item.buffer as Transferable);
            }
          }
        }
      }
    }
    return transferables;
  }

  async computeInstancedMatrices(
    instances: TransferableInstanceData[],
    basePositions: Float32Array,
    baseIndices: Uint32Array
  ): Promise<Float32Array> {
    return this.dispatch<Float32Array>('computeInstancedMatrices', {
      instances,
      basePositions,
      baseIndices,
    });
  }

  async computeBoundingBoxes(
    positionArrays: Float32Array[],
    indexArrays: Uint32Array[]
  ): Promise<TransferableBoundingBox[]> {
    return this.dispatch<TransferableBoundingBox[]>('computeBoundingBoxes', {
      positionArrays,
      indexArrays,
    });
  }

  async optimizeVertexData(
    positions: Float32Array,
    indices: Uint32Array
  ): Promise<TransferableOptimizedGeometry> {
    return this.dispatch<TransferableOptimizedGeometry>('optimizeVertexData', {
      positions,
      indices,
    });
  }

  get busyCount(): number {
    return this.busyWorkers.size;
  }

  get totalCount(): number {
    return this.workers.length;
  }

  terminate(): void {
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
    this.pending.clear();
  }
}

let pool: GeometryWorkerPool | null = null;

export function getWorkerPool(): GeometryWorkerPool {
  if (!pool) {
    pool = new GeometryWorkerPool();
  }
  return pool;
}

export function destroyWorkerPool(): void {
  if (pool) {
    pool.terminate();
    pool = null;
  }
}
