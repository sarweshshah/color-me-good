import { SerializedColorEntry, ScanContext, PropertyType } from './types';

export type ColorDisplayFormat = 'hex' | 'rgba' | 'hsla' | 'hsba';
export type UITheme = 'light' | 'dark' | 'system';

export interface PluginSettings {
  includeVectors: boolean;
  includeBooleanChildren: boolean;
  expandGradients: boolean;
  includeHiddenLayers: boolean;
  smoothZoom: boolean;
  colorDisplayFormat: ColorDisplayFormat;
  uiTheme: UITheme;
}

export type PluginMessage =
  | ScanStartedMessage
  | ScanProgressMessage
  | ScanCompleteMessage
  | ScanErrorMessage
  | SettingsMessage;

export type UIMessage =
  | SelectNodesMessage
  | ZoomToNodeMessage
  | DetachVariableMessage
  | ClearScopeMessage
  | CancelScanMessage
  | RequestRescanMessage
  | ResizeMessage
  | GetSettingsMessage
  | SetSettingMessage
  | UiViewChangedMessage;

export type UiView = 'list' | 'settings' | 'about';

export interface ScanStartedMessage {
  type: 'scan-started';
}

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
  append?: boolean;
  /** Zoom to fit selection in the viewport. Defaults to true. */
  zoom?: boolean;
  /** Pan the viewport so the selection is visible without changing zoom. */
  scrollIntoView?: boolean;
}

export interface ZoomToNodeMessage {
  type: 'zoom-to-node';
  nodeId: string;
}

export interface DetachVariableMessage {
  type: 'detach-variable';
  bindings: Array<{
    nodeId: string;
    propertyType: PropertyType;
    propertyIndex: number;
  }>;
}

export interface ClearScopeMessage {
  type: 'clear-scope';
}

export interface CancelScanMessage {
  type: 'cancel-scan';
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

export interface UiViewChangedMessage {
  type: 'ui-view-changed';
  view: UiView;
}
