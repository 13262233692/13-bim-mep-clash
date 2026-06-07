import { create } from 'zustand';
import type { IFCModel, SpatialLevel, MepElement, MepSystem, MepSystemCategory, GeometryData, InstancedMeshData, ParseProgress, BoundingBox } from '@/types';

interface MepClashStore {
  ifcModel: IFCModel | null;
  spatialLevels: SpatialLevel[];
  mepElements: MepElement[];
  mepSystems: MepSystem[];
  geometryRegistry: Map<number, GeometryData>;
  instanceRegistry: Map<string, InstancedMeshData>;
  boundingBoxes: Map<number, BoundingBox>;

  selectedLevelId: number | null;
  selectedSystemIds: string[];
  xrayMode: boolean;
  opacity: number;

  parseProgress: ParseProgress | null;
  isLoading: boolean;

  setIfcModel: (model: IFCModel) => void;
  setSpatialLevels: (levels: SpatialLevel[]) => void;
  addMepElements: (elements: MepElement[]) => void;
  setMepSystems: (systems: MepSystem[]) => void;
  setGeometryRegistry: (geometries: Map<number, GeometryData>) => void;
  setInstanceRegistry: (instances: Map<string, InstancedMeshData>) => void;
  setBoundingBoxes: (boxes: Map<number, BoundingBox>) => void;

  setSelectedLevel: (id: number | null) => void;
  toggleSystem: (systemId: string) => void;
  setAllSystemsVisible: (visible: boolean) => void;
  setXrayMode: (enabled: boolean) => void;
  setOpacity: (value: number) => void;

  setParseProgress: (progress: ParseProgress) => void;
  setIsLoading: (loading: boolean) => void;

  reset: () => void;
}

const MEP_SYSTEM_DEFAULTS: MepSystem[] = [
  { system_id: 'hvac', name: '暖通管道 (HVAC)', category: 'hvac', color: '#4A9EFF', visible: true },
  { system_id: 'cable_tray', name: '桥架', category: 'cable_tray', color: '#FFB020', visible: true },
  { system_id: 'pipe', name: '水管', category: 'pipe', color: '#00D4AA', visible: true },
];

const initialState = {
  ifcModel: null,
  spatialLevels: [],
  mepElements: [],
  mepSystems: MEP_SYSTEM_DEFAULTS,
  geometryRegistry: new Map<number, GeometryData>(),
  instanceRegistry: new Map<string, InstancedMeshData>(),
  boundingBoxes: new Map<number, BoundingBox>(),
  selectedLevelId: null,
  selectedSystemIds: ['hvac', 'cable_tray', 'pipe'],
  xrayMode: false,
  opacity: 0.35,
  parseProgress: null,
  isLoading: false,
};

export const useMepClashStore = create<MepClashStore>((set) => ({
  ...initialState,

  setIfcModel: (model) => set({ ifcModel: model }),
  setSpatialLevels: (levels) => set({ spatialLevels: levels }),
  addMepElements: (elements) => set((state) => ({
    mepElements: [...state.mepElements, ...elements],
  })),
  setMepSystems: (systems) => set({ mepSystems: systems }),
  setGeometryRegistry: (geometries) => set({ geometryRegistry: geometries }),
  setInstanceRegistry: (instances) => set({ instanceRegistry: instances }),
  setBoundingBoxes: (boxes) => set({ boundingBoxes: boxes }),

  setSelectedLevel: (id) => set({ selectedLevelId: id }),
  toggleSystem: (systemId) => set((state) => {
    const idx = state.selectedSystemIds.indexOf(systemId);
    const next = idx >= 0
      ? state.selectedSystemIds.filter((s) => s !== systemId)
      : [...state.selectedSystemIds, systemId];
    return {
      selectedSystemIds: next,
      mepSystems: state.mepSystems.map((s) =>
        s.system_id === systemId ? { ...s, visible: next.includes(systemId) } : s
      ),
    };
  }),
  setAllSystemsVisible: (visible) => set((state) => ({
    selectedSystemIds: visible ? state.mepSystems.map((s) => s.system_id) : [],
    mepSystems: state.mepSystems.map((s) => ({ ...s, visible })),
  })),
  setXrayMode: (enabled) => set({ xrayMode: enabled }),
  setOpacity: (value) => set({ opacity: value }),

  setParseProgress: (progress) => set({ parseProgress: progress }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  reset: () => set(initialState),
}));
