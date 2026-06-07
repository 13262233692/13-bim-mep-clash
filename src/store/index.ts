import { create } from 'zustand';
import type { IFCModel, SpatialLevel, MepElement, MepSystem, MepSystemCategory, GeometryData, InstancedMeshData, ParseProgress, BoundingBox, ClashPair, ClashResult, BVHBuildResult, SectionBox, ClearanceResult } from '@/types';

interface MepClashStore {
  ifcModel: IFCModel | null;
  spatialLevels: SpatialLevel[];
  mepElements: MepElement[];
  mepSystems: MepSystem[];
  geometryRegistry: Map<number, GeometryData>;
  instanceRegistry: Map<string, InstancedMeshData>;
  boundingBoxes: Map<number, BoundingBox>;
  bvhData: BVHBuildResult | null;
  clashResult: ClashResult | null;
  clashDetecting: boolean;

  sectionBoxActive: boolean;
  sectionBox: SectionBox;
  clearanceResult: ClearanceResult | null;
  clearanceChecking: boolean;

  selectedLevelId: number | null;
  selectedSystemIds: string[];
  xrayMode: boolean;
  opacity: number;
  showClashHighlights: boolean;

  parseProgress: ParseProgress | null;
  isLoading: boolean;

  setIfcModel: (model: IFCModel) => void;
  setSpatialLevels: (levels: SpatialLevel[]) => void;
  addMepElements: (elements: MepElement[]) => void;
  setMepSystems: (systems: MepSystem[]) => void;
  setGeometryRegistry: (geometries: Map<number, GeometryData>) => void;
  setInstanceRegistry: (instances: Map<string, InstancedMeshData>) => void;
  setBoundingBoxes: (boxes: Map<number, BoundingBox>) => void;
  setBvhData: (data: BVHBuildResult | null) => void;
  setClashResult: (result: ClashResult | null) => void;
  setClashDetecting: (detecting: boolean) => void;

  setSectionBoxActive: (active: boolean) => void;
  setSectionBox: (box: SectionBox) => void;
  setClearanceResult: (result: ClearanceResult | null) => void;
  setClearanceChecking: (checking: boolean) => void;

  setSelectedLevel: (id: number | null) => void;
  toggleSystem: (systemId: string) => void;
  setAllSystemsVisible: (visible: boolean) => void;
  setXrayMode: (enabled: boolean) => void;
  setOpacity: (value: number) => void;
  setShowClashHighlights: (show: boolean) => void;

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
  bvhData: null as BVHBuildResult | null,
  clashResult: null as ClashResult | null,
  clashDetecting: false,
  sectionBoxActive: false,
  sectionBox: {
    position: [0, 5, 0] as [number, number, number],
    size: [20, 10, 20] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
  } as SectionBox,
  clearanceResult: null as ClearanceResult | null,
  clearanceChecking: false,
  selectedLevelId: null,
  selectedSystemIds: ['hvac', 'cable_tray', 'pipe'],
  xrayMode: false,
  opacity: 0.35,
  showClashHighlights: true,
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
  setBvhData: (data) => set({ bvhData: data }),
  setClashResult: (result) => set({ clashResult: result }),
  setClashDetecting: (detecting) => set({ clashDetecting: detecting }),

  setSectionBoxActive: (active) => set({ sectionBoxActive: active }),
  setSectionBox: (box) => set({ sectionBox: box }),
  setClearanceResult: (result) => set({ clearanceResult: result }),
  setClearanceChecking: (checking) => set({ clearanceChecking: checking }),

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
  setShowClashHighlights: (show) => set({ showClashHighlights: show }),

  setParseProgress: (progress) => set({ parseProgress: progress }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  reset: () => set(initialState),
}));
