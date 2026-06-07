import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, ArrowLeft, ShieldAlert, Loader2, Ruler } from 'lucide-react';
import { useState } from 'react';
import { ViewerCanvas } from '@/components/scene/ViewerCanvas';
import { LevelTree } from '@/components/ui/LevelTree';
import { SystemFilter } from '@/components/ui/SystemFilter';
import { ViewerToolbar } from '@/components/ui/ViewerToolbar';
import { StatusBar } from '@/components/ui/StatusBar';
import { useMepClashStore } from '@/store';
import { runClashDetection } from '@/utils/clash';
import { runClearanceCheck } from '@/utils/section';

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
  const boundingBoxes = useMepClashStore((s) => s.boundingBoxes);
  const mepElements = useMepClashStore((s) => s.mepElements);
  const xrayMode = useMepClashStore((s) => s.xrayMode);
  const clashResult = useMepClashStore((s) => s.clashResult);
  const clashDetecting = useMepClashStore((s) => s.clashDetecting);
  const setClashResult = useMepClashStore((s) => s.setClashResult);
  const setClashDetecting = useMepClashStore((s) => s.setClashDetecting);
  const sectionBoxActive = useMepClashStore((s) => s.sectionBoxActive);
  const sectionBox = useMepClashStore((s) => s.sectionBox);
  const clearanceResult = useMepClashStore((s) => s.clearanceResult);
  const clearanceChecking = useMepClashStore((s) => s.clearanceChecking);
  const setClearanceResult = useMepClashStore((s) => s.setClearanceResult);
  const setClearanceChecking = useMepClashStore((s) => s.setClearanceChecking);

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

  const handleClashDetect = useCallback(async () => {
    if (clashDetecting) return;
    setClashDetecting(true);
    try {
      const result = await runClashDetection(boundingBoxes);
      setClashResult(result);
    } catch {
      setClashResult(null);
    } finally {
      setClashDetecting(false);
    }
  }, [boundingBoxes, clashDetecting, setClashDetecting, setClashResult]);

  const handleClearanceCheck = useCallback(async () => {
    if (clearanceChecking || !sectionBoxActive) return;
    setClearanceChecking(true);
    try {
      const result = await runClearanceCheck(boundingBoxes, mepElements, sectionBox);
      setClearanceResult(result);
    } catch {
      setClearanceResult(null);
    } finally {
      setClearanceChecking(false);
    }
  }, [boundingBoxes, mepElements, sectionBox, sectionBoxActive, clearanceChecking, setClearanceChecking, setClearanceResult]);

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

              <div className="border-t border-[#2D3548] pt-4 mx-3 space-y-2">
                <button
                  onClick={handleClashDetect}
                  disabled={clashDetecting}
                  className={`
                    w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${clashDetecting
                      ? 'bg-[#FF6B35]/10 text-[#FF6B35] cursor-wait'
                      : 'bg-[#FF6B35]/15 text-[#FF6B35] hover:bg-[#FF6B35]/25 shadow-[0_0_10px_rgba(255,107,53,0.15)]'
                    }
                  `}
                >
                  {clashDetecting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>碰撞计算中...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={16} />
                      <span>硬碰撞检测</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleClearanceCheck}
                  disabled={clearanceChecking || !sectionBoxActive}
                  className={`
                    w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${clearanceChecking
                      ? 'bg-[#FF4444]/10 text-[#FF4444] cursor-wait'
                      : !sectionBoxActive
                        ? 'bg-[#2D3548]/30 text-[#7D8590] cursor-not-allowed'
                        : 'bg-[#FF4444]/15 text-[#FF4444] hover:bg-[#FF4444]/25 shadow-[0_0_10px_rgba(255,68,68,0.15)]'
                    }
                  `}
                >
                  {clearanceChecking ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>净空审查中...</span>
                    </>
                  ) : (
                    <>
                      <Ruler size={16} />
                      <span>{sectionBoxActive ? '净空审查' : '请先开启剖切盒'}</span>
                    </>
                  )}
                </button>
              </div>

              {clashResult && (
                <div className="border-t border-[#2D3548] pt-4 mx-3">
                  <ClashResultPanel result={clashResult} />
                </div>
              )}

              {clearanceResult && (
                <div className="border-t border-[#2D3548] pt-4 mx-3">
                  <ClearanceResultPanel result={clearanceResult} />
                </div>
              )}

              {xrayMode && (
                <div className="border-t border-[#2D3548] pt-4 mx-3">
                  <XrayInfo />
                </div>
              )}

              {sectionBoxActive && (
                <div className="border-t border-[#2D3548] pt-4 mx-3">
                  <SectionBoxInfo />
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
          <ViewerCanvas
            geometries={geoData}
            instances={instanceRegistry}
            clashPairs={clashResult?.pairs}
            clearanceViolations={clearanceResult?.violations}
          />
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

function ClashResultPanel({ result }: { result: { totalCount: number; criticalCount: number; moderateCount: number; minorCount: number; detectionTimeMs: number } }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-[#7D8590] uppercase tracking-wider">
        碰撞检测结果
      </h3>
      <div className="bg-[#0D1117] rounded-lg p-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-[#7D8590]">总计</span>
          <span className="text-[#E6EDF3] font-mono font-medium">{result.totalCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#FF4444]">严重</span>
          <span className="text-[#FF4444] font-mono font-medium">{result.criticalCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#FFB020]">中等</span>
          <span className="text-[#FFB020] font-mono font-medium">{result.moderateCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#4A9EFF]">轻微</span>
          <span className="text-[#4A9EFF] font-mono font-medium">{result.minorCount}</span>
        </div>
        <div className="border-t border-[#2D3548] pt-1.5 flex justify-between text-xs">
          <span className="text-[#7D8590]">计算耗时</span>
          <span className="text-[#E6EDF3] font-mono">{result.detectionTimeMs.toFixed(0)}ms</span>
        </div>
      </div>
    </div>
  );
}

function ClearanceResultPanel({ result }: { result: { violations: { minClearance: number; violationAxes: string[]; pipeCategory: string }[]; totalCount: number; criticalCount: number; compliantCount: number; checkTimeMs: number } }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-[#FF4444] uppercase tracking-wider">
        净空审查结果
      </h3>
      <div className="bg-[#0D1117] rounded-lg p-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-[#7D8590]">审查总数</span>
          <span className="text-[#E6EDF3] font-mono font-medium">{result.totalCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#FF4444]">净空违规</span>
          <span className="text-[#FF4444] font-mono font-medium">{result.violations.length}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#FF4444]">严重违规</span>
          <span className="text-[#FF4444] font-mono font-medium">{result.criticalCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#00D4AA]">合规</span>
          <span className="text-[#00D4AA] font-mono font-medium">{result.compliantCount}</span>
        </div>
        <div className="border-t border-[#2D3548] pt-1.5 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[#7D8590]">审查耗时</span>
            <span className="text-[#E6EDF3] font-mono">{result.checkTimeMs.toFixed(0)}ms</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#7D8590]">国标净空</span>
            <span className="text-[#E6EDF3] font-mono">≥ 50mm</span>
          </div>
        </div>
        {result.violations.length > 0 && (
          <div className="border-t border-[#2D3548] pt-2 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
            {result.violations.slice(0, 10).map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${v.minClearance < 0 ? 'bg-[#FF4444]' : 'bg-[#FFB020]'}`} />
                <span className="text-[#7D8590]">{v.pipeCategory}</span>
                <span className="text-[#E6EDF3] font-mono">
                  {v.minClearance < 0 ? '侵入' : `${(v.minClearance * 1000).toFixed(1)}mm`}
                </span>
                <span className="text-[#7D8590]">
                  ({v.violationAxes.join('+')})
                </span>
              </div>
            ))}
            {result.violations.length > 10 && (
              <p className="text-xs text-[#7D8590]">...还有 {result.violations.length - 10} 项</p>
            )}
          </div>
        )}
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

function SectionBoxInfo() {
  return (
    <div className="bg-[#FF6B35]/5 border border-[#FF6B35]/20 rounded-lg p-3">
      <p className="text-xs text-[#FF6B35] font-medium mb-1">剖切盒模式</p>
      <p className="text-xs text-[#7D8590] leading-relaxed">
        拖拽剖切盒裁切模型，隐藏盒外几何体。定位到管道穿墙区域后，点击「净空审查」自动检查施工套管净空。
      </p>
    </div>
  );
}
