export type ColorType = 'solid' | 'gradient';

export type PropertyType = 'fill' | 'stroke' | 'text' | 'effect';

export type GradientType = 'LINEAR' | 'RADIAL' | 'ANGULAR' | 'DIAMOND';

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface GradientStop {
  color: RGBA;
  position: number;
}

export interface GradientData {
  gradientType: GradientType;
  stops: GradientStop[];
  angle?: number;
  transform?: number[][];
}

export interface NodeRef {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  layerPath: string;
  propertyType: PropertyType;
  propertyIndex: number;
}

export interface ColorEntry {
  type: ColorType;
  hex: string | null;
  rgba: RGBA | null;
  gradient: GradientData | null;
  dedupKey: string;
  tokenName: string | null;
  tokenCollection: string | null;
  libraryName: string | null;
  isLibraryVariable: boolean;
  styleName: string | null;
  styleId: string | null;
  propertyTypes: Set<PropertyType>;
  nodes: NodeRef[];
  usageCount: number;
  isTokenBound: boolean;
}

export type ScanMode = 'page' | 'selection';

export type ScopeNodeType = string;

export interface ScanContext {
  mode: ScanMode;
  scopeNodeId: string | null;
  scopeNodeIds: string[] | null;
  scopeNodeName: string | null;
  scopeNodeType: ScopeNodeType | null;
  totalNodesScanned: number;
  timestamp: string;
}

export interface SerializedColorEntry extends Omit<ColorEntry, 'propertyTypes'> {
  propertyTypes: PropertyType[];
}
