import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import type { ParseProgress } from '@/types';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  isParsing: boolean;
  progress: ParseProgress | null;
}

function stageColor(stage: string): string {
  switch (stage) {
    case 'ready': return 'text-[#00D4AA]';
    case 'error': return 'text-[#FF6B35]';
    default: return 'text-[#4A9EFF]';
  }
}

export function FileUploadZone({ onFileSelect, isParsing, progress }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      setError(null);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.ifc')) {
        setError('请上传 .ifc 格式的文件');
        return;
      }

      setFileName(file.name);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.ifc')) {
        setError('请上传 .ifc 格式的文件');
        return;
      }

      setFileName(file.name);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer
          ${isDragOver
            ? 'border-[#00D4AA] bg-[#00D4AA]/5 shadow-[0_0_30px_rgba(0,212,170,0.15)]'
            : isParsing
              ? 'border-[#4A9EFF]/40 bg-[#1C2333]/50'
              : 'border-[#2D3548] bg-[#1C2333]/30 hover:border-[#4A9EFF]/50 hover:bg-[#1C2333]/50'
          }
        `}
      >
        <input
          type="file"
          accept=".ifc"
          onChange={handleFileInput}
          disabled={isParsing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center gap-4">
          <div className={`
            w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
            ${isDragOver ? 'bg-[#00D4AA]/10 text-[#00D4AA]' : 'bg-[#2D3548]/50 text-[#4A9EFF]'}
          `}>
            <Upload size={36} />
          </div>

          <div className="text-center">
            <p className="text-lg font-medium text-[#E6EDF3]">
              {isParsing ? '正在解析...' : '拖拽 IFC 文件到此处'}
            </p>
            <p className="text-sm text-[#7D8590] mt-1">
              {isParsing ? fileName : '或点击选择文件 · 支持 .ifc 格式'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-[#FF6B35] bg-[#FF6B35]/10 rounded-lg p-3">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {progress && progress.stage !== 'idle' && (
        <ParseProgressPanel progress={progress} />
      )}
    </div>
  );
}

function ParseProgressPanel({ progress }: { progress: ParseProgress }) {
  return (
    <div className="mt-6 bg-[#1C2333] rounded-xl p-5 border border-[#2D3548]">
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-medium ${stageColor(progress.stage)}`}>
          {progress.message}
        </span>
        <span className="text-sm text-[#7D8590] font-mono">
          {progress.percentage}%
        </span>
      </div>

      <div className="h-2 bg-[#0D1117] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress.percentage}%`,
            background: progress.stage === 'ready'
              ? 'linear-gradient(90deg, #00D4AA, #00D4AA80)'
              : progress.stage === 'error'
                ? '#FF6B35'
                : 'linear-gradient(90deg, #4A9EFF, #00D4AA)',
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <StatCard
          icon={<FileText size={14} />}
          label="实体数量"
          value={progress.entity_count.toLocaleString()}
        />
        <StatCard
          icon={<FileText size={14} />}
          label="几何体"
          value={progress.geometry_count.toLocaleString()}
        />
        <StatCard
          icon={<FileText size={14} />}
          label="内存占用"
          value={`${progress.memory_mb.toFixed(1)} MB`}
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#0D1117] rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[#7D8590] mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-[#E6EDF3] font-mono text-sm font-medium">{value}</p>
    </div>
  );
}
