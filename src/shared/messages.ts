import { SerializedColorEntry, ScanContext } from './types';

export type PluginMessage =
  | ScanProgressMessage
  | ScanCompleteMessage
  | ScanErrorMessage
  | ScopeChangedMessage;

export type UIMessage =
  | SelectNodesMessage
  | ZoomToNodeMessage
  | ClearScopeMessage
  | RequestRescanMessage
  | ResizeMessage
  | SetIncludeVectorsMessage;

export interface ScanProgressMessage {
  type: 'scan-progress';
  scanned: number;
  total: number;
}

export interface ScanCompleteMessage {
  type: 'scan-complete';
  colors: SerializedColorEntry[];
  context: ScanContext;
}

export interface ScanErrorMessage {
  type: 'scan-error';
  message: string;
}

export interface ScopeChangedMessage {
  type: 'scope-changed';
  context: ScanContext;
}

export interface SelectNodesMessage {
  type: 'select-nodes';
  nodeIds: string[];
}

export interface ZoomToNodeMessage {
  type: 'zoom-to-node';
  nodeId: string;
}

export interface ClearScopeMessage {
  type: 'clear-scope';
}

export interface RequestRescanMessage {
  type: 'request-rescan';
}

export interface ResizeMessage {
  type: 'resize';
  width: number;
  height: number;
}

export interface SetIncludeVectorsMessage {
  type: 'set-include-vectors';
  includeVectors: boolean;
}
