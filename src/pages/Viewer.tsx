import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { ViewerCanvas } from '@/components/scene/ViewerCanvas';
import { LevelTree } from '@/components/ui/LevelTree';
import { SystemFilter } from '@/components/ui/SystemFilter';
import { ViewerToolbar } from '@/components/ui/ViewerToolbar';
import { StatusBar } from '@/components/ui/StatusBar';
import { useMepClashStore } from '@/store';

export default function ViewerPage() {
  const navigate = useNavigate();
  const ifcModel = useMepClashStore((s) => s.ifcModel);
  const spatialLevels = useMepClashStore((s) => s.spatialLevels);
  const mepSystems = useMepClashStore((s) => s.mepSystems);
  const selectedLevelId = useMepClashStore((s) => s.selectedLevelId);
  const selectedSystemIds = useMepClashStore((s) => s.selectedSystemIds);
  const toggleSystem = useMepClashStore((s) => s.toggleSystem);
  const setSelectedLevel = useMepClashStore((s) => s.setSelectedLevel);
  const geometryRegistry = useMepClashStore((s) => s.geometryRegistry);
  const instanceRegistry = useMepClashStore((s) => s.instanceRegistry);
  const xrayMode = useMepClashStore((s) => s.xrayMode);

  const [panelOpen, setPanelOpen] = useState(true);

  const geoData = useMemo(() => {
    const map = new Map<number, { positions: Float32Array; indices: Uint32Array; normals: Float32Array | null }>();
    geometryRegistry.forEach((val, key) => {
      map.set(key, {
        positions: val.positions,
        indices: val.indices,
        normals: val.normals,
      });
    });
    return map;
  }, [geometryRegistry]);

  if (!ifcModel) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#7D8590] mb-4">尚未加载 IFC 模型</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#4A9EFF] text-white rounded-lg hover:bg-[#4A9EFF]/80 transition-colors"
          >
            返回上传
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0D1117] flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden relative">
        {panelOpen && (
          <aside className={`
            w-64 bg-[#1C2333]/95 backdrop-blur-md border-r border-[#2D3548] flex flex-col overflow-hidden
            transition-all duration-300
          `}>
            <div className="h-12 border-b border-[#2D3548] flex items-center justify-between px-4">
              <span className="text-sm font-medium text-[#E6EDF3] truncate">
                {ifcModel.filename}
              </span>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
              >
                <PanelLeftClose size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-6 custom-scrollbar">
              <div>
                <LevelTree
                  levels={spatialLevels}
                  selectedLevelId={selectedLevelId}
                  onSelectLevel={setSelectedLevel}
                />
              </div>

              <div className="border-t border-[#2D3548] pt-4 mx-3">
                <SystemFilter
                  systems={mepSystems}
                  selectedIds={selectedSystemIds}
                  onToggle={toggleSystem}
                />
              </div>

              {xrayMode && (
                <div className="border-t border-[#2D3548] pt-4 mx-3">
                  <XrayInfo />
                </div>
              )}
            </div>

            <div className="border-t border-[#2D3548] p-3">
              <ModelInfo model={ifcModel} />
            </div>
          </aside>
        )}

        {!panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="absolute left-3 top-3 z-10 w-9 h-9 bg-[#1C2333]/90 border border-[#2D3548] rounded-lg flex items-center justify-center text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}

        <main className="flex-1 relative">
          <ViewerCanvas geometries={geoData} instances={instanceRegistry} />
          <ViewerToolbar />

          <button
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 z-10 w-9 h-9 bg-[#1C2333]/90 border border-[#2D3548] rounded-lg flex items-center justify-center text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
            style={{ display: panelOpen ? 'none' : 'flex' }}
          >
            <ArrowLeft size={16} />
          </button>
        </main>
      </div>

      <StatusBar />
    </div>
  );
}

function ModelInfo({ model }: { model: { entity_count: number; geometry_count: number; parse_time_ms: number } }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-[#7D8590]">实体</span>
        <span className="text-[#E6EDF3] font-mono">{model.entity_count.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-[#7D8590]">几何体</span>
        <span className="text-[#E6EDF3] font-mono">{model.geometry_count.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-[#7D8590]">解析耗时</span>
        <span className="text-[#E6EDF3] font-mono">{model.parse_time_ms}ms</span>
      </div>
    </div>
  );
}

function XrayInfo() {
  return (
    <div className="bg-[#00D4AA]/5 border border-[#00D4AA]/20 rounded-lg p-3">
      <p className="text-xs text-[#00D4AA] font-medium mb-1">X 光透视模式</p>
      <p className="text-xs text-[#7D8590] leading-relaxed">
        半透明材质已启用，可透视墙体内隐藏管网。使用顶部工具栏调节透明度和重置视图。
      </p>
    </div>
  );
}
