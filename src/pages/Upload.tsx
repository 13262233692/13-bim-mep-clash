import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Zap } from 'lucide-react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { useMepClashStore } from '@/store';
import { parseIfcFile } from '@/wasm/ifc-parser';
import { getWorkerPool } from '@/workers/pool';
import { buildInstancedMeshes } from '@/utils/geometry';
import type { ParseProgress, GeometryData, InstancedMeshData, BoundingBox } from '@/types';

export default function UploadPage() {
  const navigate = useNavigate();
  const setIfcModel = useMepClashStore((s) => s.setIfcModel);
  const setSpatialLevels = useMepClashStore((s) => s.setSpatialLevels);
  const addMepElements = useMepClashStore((s) => s.addMepElements);
  const setGeometryRegistry = useMepClashStore((s) => s.setGeometryRegistry);
  const setInstanceRegistry = useMepClashStore((s) => s.setInstanceRegistry);
  const setBoundingBoxes = useMepClashStore((s) => s.setBoundingBoxes);
  const setIsLoading = useMepClashStore((s) => s.setIsLoading);
  const resetStore = useMepClashStore((s) => s.reset);

  const [progress, setProgress] = useState<ParseProgress>({
    stage: 'idle',
    percentage: 0,
    message: '等待文件上传',
    entity_count: 0,
    geometry_count: 0,
    memory_mb: 0,
  });
  const [isParsing, setIsParsing] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsParsing(true);
    setIsLoading(true);
    resetStore();

    try {
      const result = await parseIfcFile(file, (p) => setProgress(p));

      setIfcModel(result.model);
      setSpatialLevels(result.levels);
      addMepElements(result.elements);
      setGeometryRegistry(result.geometries);

      const pool = getWorkerPool();
      setIsLoading(true);

      const positionArrays: Float32Array[] = [];
      const indexArrays: Uint32Array[] = [];
      const elementIds: number[] = [];

      result.geometries.forEach((geo, id) => {
        positionArrays.push(geo.positions);
        indexArrays.push(geo.indices);
        elementIds.push(id);
      });

      const boxes = await pool.computeBoundingBoxes(positionArrays, indexArrays);
      const bboxMap = new Map<number, BoundingBox>();
      boxes.forEach((box, i) => {
        bboxMap.set(elementIds[i], box);
      });
      setBoundingBoxes(bboxMap);

      const instances = buildInstancedMeshes(result.elements, result.geometries, bboxMap);
      setInstanceRegistry(instances);

      setIsLoading(false);
      navigate('/viewer');
    } catch (err) {
      setProgress({
        stage: 'error',
        percentage: 0,
        message: `解析失败: ${err instanceof Error ? err.message : String(err)}`,
        entity_count: 0,
        geometry_count: 0,
        memory_mb: 0,
      });
    } finally {
      setIsParsing(false);
    }
  }, [navigate, setIfcModel, setSpatialLevels, addMepElements, setGeometryRegistry, setInstanceRegistry, setBoundingBoxes, setIsLoading, resetStore]);

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col">
      <header className="border-b border-[#2D3548] bg-[#1C2333]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00D4AA]/15 rounded-lg flex items-center justify-center">
              <Building2 size={18} className="text-[#00D4AA]" />
            </div>
            <span className="text-[#E6EDF3] font-medium">BIM MEP Clash</span>
            <span className="text-xs text-[#7D8590] bg-[#2D3548] px-2 py-0.5 rounded">v0.1</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#7D8590]">
            <Zap size={12} className="text-[#FFB020]" />
            <span>WASM + Web Worker 加速</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#E6EDF3] mb-2">
            IFC 机电管线审查平台
          </h1>
          <p className="text-[#7D8590] max-w-lg mx-auto">
            上传 IFC 建筑模型文件，WASM 引擎将并行解析 Swept Solid 几何与空间层级，
            Web Worker 离屏计算实例化矩阵，实现百万级顶点管网的实时三维审查
          </p>
        </div>
      </main>

      <div className="px-8 pb-16">
        <FileUploadZone
          onFileSelect={handleFileSelect}
          isParsing={isParsing}
          progress={progress}
        />
      </div>

      <div className="border-t border-[#2D3548] bg-[#1C2333]/30">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <FeatureCard
              title="WASM 并行解析"
              desc="Rust 编译的 WASM 模块在前端高效解析超大 IFC 文件，精准提取 Swept Solid 几何"
            />
            <FeatureCard
              title="Worker 离屏计算"
              desc="InstancedMatrix 与包围盒构建全部剥离至 Web Worker，保证主线程 UI 流畅"
            />
            <FeatureCard
              title="X 光透视渲染"
              desc="半透明材质透视墙体内管网，Bloom 发光与环境遮蔽增强空间感知"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-[#1C2333]/50 border border-[#2D3548] rounded-xl p-4">
      <h3 className="text-sm font-medium text-[#E6EDF3] mb-1">{title}</h3>
      <p className="text-xs text-[#7D8590] leading-relaxed">{desc}</p>
    </div>
  );
}
