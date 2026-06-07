import { ChevronRight, ChevronDown, Building2, Layers } from 'lucide-react';
import { useState } from 'react';
import type { SpatialLevel } from '@/types';

interface LevelTreeProps {
  levels: SpatialLevel[];
  selectedLevelId: number | null;
  onSelectLevel: (id: number | null) => void;
}

export function LevelTree({ levels, selectedLevelId, onSelectLevel }: LevelTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rootLevels = levels.filter((l) => l.parent_id === null);
  const childMap = new Map<number | null, SpatialLevel[]>();
  for (const level of levels) {
    if (!childMap.has(level.parent_id)) childMap.set(level.parent_id, []);
    childMap.get(level.parent_id)!.push(level);
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => onSelectLevel(null)}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
          ${selectedLevelId === null
            ? 'bg-[#4A9EFF]/15 text-[#4A9EFF]'
            : 'text-[#7D8590] hover:bg-[#2D3548]/50 hover:text-[#E6EDF3]'
          }
        `}
      >
        <Layers size={16} />
        <span>全部楼层</span>
      </button>

      {rootLevels.map((level) => (
        <LevelNode
          key={level.express_id}
          level={level}
          childMap={childMap}
          expandedIds={expandedIds}
          selectedLevelId={selectedLevelId}
          onToggle={toggleExpand}
          onSelect={onSelectLevel}
          depth={0}
        />
      ))}
    </div>
  );
}

interface LevelNodeProps {
  level: SpatialLevel;
  childMap: Map<number | null, SpatialLevel[]>;
  expandedIds: Set<number>;
  selectedLevelId: number | null;
  onToggle: (id: number) => void;
  onSelect: (id: number | null) => void;
  depth: number;
}

function LevelNode({ level, childMap, expandedIds, selectedLevelId, onToggle, onSelect, depth }: LevelNodeProps) {
  const children = childMap.get(level.express_id) || [];
  const isExpanded = expandedIds.has(level.express_id);
  const isSelected = selectedLevelId === level.express_id;
  const hasChildren = children.length > 0;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) onToggle(level.express_id);
          onSelect(level.express_id);
        }}
        className={`
          w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
          ${isSelected
            ? 'bg-[#4A9EFF]/15 text-[#4A9EFF]'
            : 'text-[#7D8590] hover:bg-[#2D3548]/50 hover:text-[#E6EDF3]'
          }
        `}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : (
          <span className="w-3.5" />
        )}
        <Building2 size={14} />
        <span>{level.name}</span>
      </button>

      {isExpanded && children.map((child) => (
        <LevelNode
          key={child.express_id}
          level={child}
          childMap={childMap}
          expandedIds={expandedIds}
          selectedLevelId={selectedLevelId}
          onToggle={onToggle}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
