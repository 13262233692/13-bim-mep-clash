import { Wind, Cable, Droplets, Eye, EyeOff } from 'lucide-react';
import type { MepSystem, MepSystemCategory } from '@/types';

const SYSTEM_ICONS: Record<MepSystemCategory, React.ReactNode> = {
  hvac: <Wind size={16} />,
  cable_tray: <Cable size={16} />,
  pipe: <Droplets size={16} />,
};

interface SystemFilterProps {
  systems: MepSystem[];
  selectedIds: string[];
  onToggle: (systemId: string) => void;
}

export function SystemFilter({ systems, selectedIds, onToggle }: SystemFilterProps) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-medium text-[#7D8590] uppercase tracking-wider px-3 mb-2">
        机电系统
      </h3>
      {systems.map((sys) => {
        const isVisible = selectedIds.includes(sys.system_id);
        return (
          <button
            key={sys.system_id}
            onClick={() => onToggle(sys.system_id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
              ${isVisible
                ? 'text-[#E6EDF3] hover:bg-[#2D3548]/50'
                : 'text-[#484F58] hover:bg-[#2D3548]/30 hover:text-[#7D8590]'
              }
            `}
          >
            <span style={{ color: isVisible ? sys.color : undefined }}>
              {SYSTEM_ICONS[sys.category]}
            </span>
            <span className="flex-1 text-left">{sys.name}</span>
            {isVisible ? <Eye size={14} className="text-[#7D8590]" /> : <EyeOff size={14} />}
          </button>
        );
      })}
    </div>
  );
}
