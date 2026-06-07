import { Activity, Cpu, HardDrive } from 'lucide-react';
import { getWorkerPool } from '@/workers/pool';
import { useMepClashStore } from '@/store';
import { useEffect, useState } from 'react';

export function StatusBar() {
  const isLoading = useMepClashStore((s) => s.isLoading);
  const mepElements = useMepClashStore((s) => s.mepElements);
  const [workerInfo, setWorkerInfo] = useState({ busy: 0, total: 0 });
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const pool = getWorkerPool();
        setWorkerInfo({ busy: pool.busyCount, total: pool.totalCount });
      } catch {
        setWorkerInfo({ busy: 0, total: 0 });
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;

    const tick = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="h-8 bg-[#1C2333]/90 border-t border-[#2D3548] flex items-center justify-between px-4 text-xs">
      <div className="flex items-center gap-4">
        <StatusItem
          icon={<Activity size={12} />}
          color={fps >= 50 ? '#00D4AA' : fps >= 30 ? '#FFB020' : '#FF6B35'}
          label={`${fps} FPS`}
        />
        <StatusItem
          icon={<Cpu size={12} />}
          color={workerInfo.busy > 0 ? '#4A9EFF' : '#7D8590'}
          label={`Worker ${workerInfo.busy}/${workerInfo.total}`}
        />
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[#7D8590]">
          {mepElements.length.toLocaleString()} 个构件
        </span>
        {isLoading && (
          <span className="text-[#4A9EFF] flex items-center gap-1">
            <HardDrive size={12} className="animate-pulse" />
            计算中...
          </span>
        )}
      </div>
    </div>
  );
}

function StatusItem({ icon, color, label }: { icon: React.ReactNode; color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5" style={{ color }}>
      {icon}
      <span className="font-mono">{label}</span>
    </span>
  );
}
