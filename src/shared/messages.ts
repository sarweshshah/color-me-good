import { SerializedColorEntry, ScanContext } from './types';

export type ColorDisplayFormat = 'hex' | 'rgba' | 'hsla' | 'hsba';
export type UITheme = 'light' | 'dark' | 'system';

export interface PluginSettings {
  includeVectors: boolean;
  smoothZoom: boolean;
  colorDisplayFormat: ColorDisplayFormat;
  uiTheme: UITheme;
}

export type PluginMessage =
  | ScanProgressMessage
  | ScanCompleteMessage
  | ScanErrorMessage
  | SettingsMessage;

export type UIMessage =
  | SelectNodesMessage
  | ZoomToNodeMessage
  | ClearScopeMessage
  | RequestRescanMessage
  | ResizeMessage
  | GetSettingsMessage
  | SetSettingMessage;

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

export interface SettingsMessage {
  type: 'settings';
  settings: PluginSettings;
}

export interface GetSettingsMessage {
  type: 'get-settings';
}

export interface SetSettingMessage {
  type: 'set-setting';
  key: keyof PluginSettings;
  value: PluginSettings[keyof PluginSettings];
}
