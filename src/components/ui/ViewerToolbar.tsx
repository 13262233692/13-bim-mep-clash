import { ScanEye, RotateCcw, SlidersHorizontal, BoxSelect } from 'lucide-react';
import { useMepClashStore } from '@/store';

export function ViewerToolbar() {
  const xrayMode = useMepClashStore((s) => s.xrayMode);
  const setXrayMode = useMepClashStore((s) => s.setXrayMode);
  const opacity = useMepClashStore((s) => s.opacity);
  const setOpacity = useMepClashStore((s) => s.setOpacity);
  const sectionBoxActive = useMepClashStore((s) => s.sectionBoxActive);
  const setSectionBoxActive = useMepClashStore((s) => s.setSectionBoxActive);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-[#1C2333]/90 backdrop-blur-md border border-[#2D3548] rounded-xl px-3 py-2 shadow-lg">
      <ToolbarButton
        active={xrayMode}
        onClick={() => setXrayMode(!xrayMode)}
        icon={<ScanEye size={18} />}
        label="X 光透视"
        activeColor="#00D4AA"
      />

      <div className="w-px h-6 bg-[#2D3548]" />

      <ToolbarButton
        active={sectionBoxActive}
        onClick={() => setSectionBoxActive(!sectionBoxActive)}
        icon={<BoxSelect size={18} />}
        label="剖切盒"
        activeColor="#FF6B35"
      />

      <div className="w-px h-6 bg-[#2D3548]" />

      <div className="flex items-center gap-2 px-2">
        <SlidersHorizontal size={14} className="text-[#7D8590]" />
        <input
          type="range"
          min={0.05}
          max={0.95}
          step={0.05}
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="w-20 h-1 bg-[#2D3548] rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-[#00D4AA] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(0,212,170,0.4)]"
        />
        <span className="text-xs text-[#7D8590] font-mono w-8">{Math.round(opacity * 100)}%</span>
      </div>

      <div className="w-px h-6 bg-[#2D3548]" />

      <ToolbarButton
        onClick={() => {
          setXrayMode(false);
          setOpacity(0.35);
          setSectionBoxActive(false);
        }}
        icon={<RotateCcw size={16} />}
        label="重置"
      />
    </div>
  );
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeColor?: string;
}

function ToolbarButton({ active, onClick, icon, label, activeColor }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all
        ${active
          ? 'bg-[#00D4AA]/15 text-[#00D4AA] shadow-[0_0_10px_rgba(0,212,170,0.2)]'
          : 'text-[#7D8590] hover:text-[#E6EDF3] hover:bg-[#2D3548]/50'
        }
      `}
      style={active && activeColor ? { backgroundColor: `${activeColor}15`, color: activeColor, boxShadow: `0 0 10px ${activeColor}33` } : undefined}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
