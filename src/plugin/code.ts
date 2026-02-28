import { scanCurrentPage, scanNodesForColors, SCAN_CANCELLED_MESSAGE } from './scanner';
import { SerializedColorEntry, ColorEntry, ScanContext } from '../shared/types';
import { UIMessage, PluginSettings } from '../shared/messages';

const SETTINGS_STORAGE_KEY = 'color-me-good-settings';

let resizeBounds = {
  minWidth: 420,
  maxWidth: 540,
  minHeight: 720,
  maxHeight: 840,
};

const VALID_FORMATS = ['hex', 'rgba', 'hsla', 'hsba'] as const;
const VALID_UI_THEMES = ['light', 'dark', 'system'] as const;

const DEFAULT_SETTINGS: PluginSettings = {
  includeVectors: false,
  smoothZoom: true,
  colorDisplayFormat: 'hex',
  uiTheme: 'system',
};

async function loadSettings(): Promise<PluginSettings> {
  try {
    const raw = await figma.clientStorage.getAsync(SETTINGS_STORAGE_KEY);
    if (
      raw &&
      typeof raw === 'object' &&
      'includeVectors' in raw &&
      'smoothZoom' in raw
    ) {
      const loaded = raw as PluginSettings;
      const format =
        'colorDisplayFormat' in loaded && VALID_FORMATS.includes(loaded.colorDisplayFormat as typeof VALID_FORMATS[number])
          ? loaded.colorDisplayFormat
          : 'hex';
      const theme =
        'uiTheme' in loaded && VALID_UI_THEMES.includes(loaded.uiTheme as typeof VALID_UI_THEMES[number])
          ? loaded.uiTheme
          : 'system';
      return {
        includeVectors: Boolean(loaded.includeVectors),
        smoothZoom: Boolean(loaded.smoothZoom),
        colorDisplayFormat: format,
        uiTheme: theme,
      };
    }
  } catch (_) {}
  return { ...DEFAULT_SETTINGS };
}

async function saveSettings(settings: PluginSettings): Promise<void> {
  await figma.clientStorage.setAsync(SETTINGS_STORAGE_KEY, settings);
}

function sendSettingsToUI(settings: PluginSettings): void {
  figma.ui.postMessage({ type: 'settings', settings });
}

let cachedResults: {
  colors: SerializedColorEntry[];
  context: ScanContext;
} | null = null;
let latestViewState: {
  colors: SerializedColorEntry[];
  context: ScanContext;
} | null = null;

let selectionDebounce: number | null = null;
let documentDebounce: number | null = null;
let pendingChanges: Array<{ type: string; id: string }> = [];
let currentScanId = 0;
let includeVectors = false;
let smoothZoom = true;
let colorDisplayFormat: PluginSettings['colorDisplayFormat'] = 'hex';
let uiTheme: PluginSettings['uiTheme'] = 'system';
let ignoreNextSelectionChange = false;
let zoomToNodeTimer: ReturnType<typeof setTimeout> | null = null;

figma.showUI(__html__, {
  width: resizeBounds.minWidth,
  height: resizeBounds.minHeight,
  themeColors: true,
});

figma.ui.onmessage = async (msg: UIMessage) => {
  switch (msg.type) {
    case 'select-nodes':
      await handleSelectNodes(msg.nodeIds);
      break;
    case 'zoom-to-node':
      await handleZoomToNode(msg.nodeId);
      break;
    case 'clear-scope':
      ignoreNextSelectionChange = true;
      figma.currentPage.selection = [];
      lastScanScopeId = null;
      sendNoSelectionState();
      break;
    case 'request-rescan':
      await performScan();
      break;
    case 'resize':
      figma.ui.resize(
        Math.max(resizeBounds.minWidth, Math.min(resizeBounds.maxWidth, msg.width)),
        Math.max(resizeBounds.minHeight, Math.min(resizeBounds.maxHeight, msg.height))
      );
      break;
    case 'get-settings':
      sendSettingsToUI({ includeVectors, smoothZoom, colorDisplayFormat, uiTheme });
      if (latestViewState) {
        figma.ui.postMessage({
          type: 'scan-complete',
          colors: latestViewState.colors,
          context: latestViewState.context,
        });
      }
      break;
    case 'set-setting':
      if (msg.key === 'includeVectors') {
        includeVectors = msg.value as boolean;
        await saveSettings({ includeVectors, smoothZoom, colorDisplayFormat, uiTheme });
        sendSettingsToUI({ includeVectors, smoothZoom, colorDisplayFormat, uiTheme });
        await performScan();
      } else if (msg.key === 'smoothZoom') {
        smoothZoom = msg.value as boolean;
        await saveSettings({ includeVectors, smoothZoom, colorDisplayFormat, uiTheme });
        sendSettingsToUI({ includeVectors, smoothZoom, colorDisplayFormat, uiTheme });
      } else if (msg.key === 'colorDisplayFormat') {
        colorDisplayFormat = msg.value as PluginSettings['colorDisplayFormat'];
        await saveSettings({ includeVectors, smoothZoom, colorDisplayFormat, uiTheme });
        sendSettingsToUI({ includeVectors, smoothZoom, colorDisplayFormat, uiTheme });
      } else if (msg.key === 'uiTheme') {
        uiTheme = msg.value as PluginSettings['uiTheme'];
        await saveSettings({ includeVectors, smoothZoom, colorDisplayFormat, uiTheme });
        sendSettingsToUI({ includeVectors, smoothZoom, colorDisplayFormat, uiTheme });
      }
      break;
  }
};

async function handleSelectNodes(nodeIds: string[]): Promise<void> {
  try {
    const nodes = await Promise.all(nodeIds.map((id) => figma.getNodeByIdAsync(id)));
    const validNodes = nodes.filter(
      (node): node is SceneNode => node !== null && 'id' in node
    );
    ignoreNextSelectionChange = true;
    figma.currentPage.selection = validNodes;

    if (validNodes.length > 0) {
      figma.viewport.scrollAndZoomIntoView(validNodes);
    }
  } catch (error) {
    console.error('Failed to select nodes:', error);
    figma.ui.postMessage({
      type: 'scan-error',
      message: 'Failed to select elements',
    });
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const ZOOM_DURATION_MS = 280;
const ZOOM_PADDING = 40;

async function handleZoomToNode(nodeId: string): Promise<void> {
  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || !('id' in node)) return;

    ignoreNextSelectionChange = true;
    figma.currentPage.selection = [node as SceneNode];

    const sceneNode = node as SceneNode;

    if (!smoothZoom) {
      figma.viewport.scrollAndZoomIntoView([sceneNode]);
      return;
    }

    const bounds =
      'absoluteBoundingBox' in sceneNode
        ? (sceneNode as LayoutMixin).absoluteBoundingBox
        : null;

    if (!bounds) {
      figma.viewport.scrollAndZoomIntoView([sceneNode]);
      return;
    }

    const startCenter = { ...figma.viewport.center };
    const startZoom = figma.viewport.zoom;
    const nodeCenterX = bounds.x + bounds.width / 2;
    const nodeCenterY = bounds.y + bounds.height / 2;
    const vp = figma.viewport.bounds;
    const pad = ZOOM_PADDING * 2;
    const targetZoom = Math.min(
      startZoom,
      (startZoom * vp.width) / (bounds.width + pad),
      (startZoom * vp.height) / (bounds.height + pad)
    );
    const targetZoomClamped = Math.max(0.01, Math.min(4, targetZoom));

    if (zoomToNodeTimer != null) clearTimeout(zoomToNodeTimer);
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / ZOOM_DURATION_MS);
      const eased = easeOutCubic(t);

      figma.viewport.center = {
        x: lerp(startCenter.x, nodeCenterX, eased),
        y: lerp(startCenter.y, nodeCenterY, eased),
      };
      figma.viewport.zoom = lerp(startZoom, targetZoomClamped, eased);

      if (t < 1) {
        zoomToNodeTimer = setTimeout(tick, 16);
      } else {
        zoomToNodeTimer = null;
      }
    };
    tick();
  } catch (error) {
    console.error('Failed to zoom to node:', error);
  }
}

async function performScan(): Promise<void> {
  const myScanId = ++currentScanId;

  try {
    const result = await scanCurrentPage({
      includeVectors,
      isCancelled: () => currentScanId !== myScanId,
      onProgress: (scanned, total) => {
        figma.ui.postMessage({
          type: 'scan-progress',
          scanned,
          total,
        });
      },
      onError: (error) => {
        figma.ui.postMessage({
          type: 'scan-error',
          message: error.message,
        });
      },
    });

    const serializedColors = serializeColors(result.colors);

    cachedResults = {
      colors: serializedColors,
      context: result.context,
    };
    latestViewState = cachedResults;

    figma.ui.postMessage({
      type: 'scan-complete',
      colors: serializedColors,
      context: result.context,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (err.message === SCAN_CANCELLED_MESSAGE) {
      return;
    }
    console.error('Scan failed:', error);
    figma.ui.postMessage({
      type: 'scan-error',
      message: err.message,
    });
  } finally {
    // When superseded (currentScanId !== myScanId), the newer scan owns the state; nothing to do here.
  }
}

function serializeColors(colors: ColorEntry[]): SerializedColorEntry[] {
  return colors.map((color) => ({
    ...color,
    propertyTypes: Array.from(color.propertyTypes),
  }));
}

function removeNodesFromCachedResults(nodeIds: Set<string>): void {
  if (!cachedResults) return;

  const nextColors: SerializedColorEntry[] = [];
  for (const color of cachedResults.colors) {
    const nextNodes = color.nodes.filter((node) => !nodeIds.has(node.nodeId));
    if (nextNodes.length === 0) continue;

    nextColors.push({
      ...color,
      nodes: nextNodes,
      usageCount: nextNodes.length,
      propertyTypes: Array.from(new Set(nextNodes.map((n) => n.propertyType))),
    });
  }

  cachedResults.colors = nextColors;
}

function mergeColorsIntoCachedResults(colors: SerializedColorEntry[]): void {
  if (!cachedResults) return;

  const byDedupKey: Record<string, SerializedColorEntry> = {};
  for (const color of cachedResults.colors) {
    byDedupKey[color.dedupKey] = color;
  }

  for (const incoming of colors) {
    const existing = byDedupKey[incoming.dedupKey];
    if (!existing) {
      byDedupKey[incoming.dedupKey] = incoming;
      continue;
    }

    const mergedNodes = [...existing.nodes, ...incoming.nodes];
    byDedupKey[incoming.dedupKey] = {
      ...existing,
      nodes: mergedNodes,
      usageCount: mergedNodes.length,
      propertyTypes: Array.from(
        new Set([...existing.propertyTypes, ...incoming.propertyTypes])
      ),
    };
  }

  cachedResults.colors = Object.values(byDedupKey);
}

async function performIncrementalUpdate(nodeIds: Set<string>): Promise<void> {
  if (!cachedResults || nodeIds.size === 0) return;

  removeNodesFromCachedResults(nodeIds);

  const resolved = await Promise.all(
    Array.from(nodeIds).map((id) => figma.getNodeByIdAsync(id))
  );
  const nodes = resolved.filter(
    (node): node is SceneNode => node !== null && 'id' in node
  );

  if (nodes.length > 0) {
    const scanned = await scanNodesForColors(nodes, { includeVectors });
    const serialized = serializeColors(scanned);
    mergeColorsIntoCachedResults(serialized);
  }

  cachedResults.context = {
    ...cachedResults.context,
    timestamp: new Date().toISOString(),
  };
  latestViewState = cachedResults;

  figma.ui.postMessage({
    type: 'scan-complete',
    colors: cachedResults.colors,
    context: cachedResults.context,
  });
}

let lastScanScopeId: string | null = null;

function sendNoSelectionState(): void {
  latestViewState = {
    colors: [],
    context: {
      mode: 'selection',
      scopeNodeId: null,
      scopeNodeIds: null,
      scopeNodeName: null,
      scopeNodeType: null,
      totalNodesScanned: 0,
      timestamp: new Date().toISOString(),
    },
  };
  figma.ui.postMessage({
    type: 'scan-complete',
    colors: latestViewState.colors,
    context: latestViewState.context,
  });
}

function getScopeId(): string | null {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) return null;
  if (sel.length === 1) return sel[0].id;
  return sel
    .map((n) => n.id)
    .sort()
    .join(',');
}

async function isNodeWithinScope(nodeId: string, scopeIds: Set<string>): Promise<boolean> {
  try {
    let node: BaseNode | null = await figma.getNodeByIdAsync(nodeId);
    while (node) {
      if (scopeIds.has(node.id)) return true;
      node = node.parent;
    }
  } catch {}
  return false;
}

function getScannedNodeIds(): Set<string> {
  const ids = new Set<string>();
  if (cachedResults) {
    for (const id of cachedResults.context.scopeNodeIds ?? []) {
      ids.add(id);
    }
    for (const color of cachedResults.colors) {
      for (const nodeRef of color.nodes) {
        ids.add(nodeRef.nodeId);
      }
    }
  }
  return ids;
}

function setupListeners(): void {
  figma.on('selectionchange', () => {
    if (ignoreNextSelectionChange) {
      ignoreNextSelectionChange = false;
      return;
    }

    if (selectionDebounce !== null) {
      clearTimeout(selectionDebounce);
    }

    selectionDebounce = setTimeout(async () => {
      selectionDebounce = null;
      const currentScopeId = getScopeId();
      if (currentScopeId !== lastScanScopeId) {
        lastScanScopeId = currentScopeId;
        if (currentScopeId === null) {
          sendNoSelectionState();
        } else {
          await performScan();
        }
      }
    }, 500) as unknown as number;
  });

  figma.on('documentchange', (event) => {
    for (const change of event.documentChanges) {
      if (change.type === 'CREATE' || change.type === 'DELETE' || change.type === 'PROPERTY_CHANGE') {
        pendingChanges.push({ type: change.type, id: change.id });
      }
    }

    if (documentDebounce !== null) {
      clearTimeout(documentDebounce);
    }

    documentDebounce = setTimeout(async () => {
      documentDebounce = null;
      const changes = pendingChanges;
      pendingChanges = [];

      const scopeId = getScopeId();

      if (scopeId === null) {
        if (lastScanScopeId !== null) {
          lastScanScopeId = null;
          sendNoSelectionState();
        }
        return;
      }

      const scopeNodeIds = cachedResults?.context.scopeNodeIds ?? [];
      const scopeSet = new Set(scopeNodeIds);

      if (
        scopeSet.size > 0 &&
        changes.some((c) => c.type === 'DELETE' && scopeSet.has(c.id))
      ) {
        figma.currentPage.selection = [];
        lastScanScopeId = null;
        sendNoSelectionState();
        figma.ui.postMessage({
          type: 'scan-error',
          message: 'Scoped element was deleted. Select something to scan.',
        });
        return;
      }

      if (!cachedResults) {
        lastScanScopeId = scopeId;
        await performScan();
        return;
      }

      const scannedIds = getScannedNodeIds();
      let shouldFullRescan = false;
      const incrementalNodeIds = new Set<string>();

      for (const change of changes) {
        if (change.type === 'DELETE') {
          if (scannedIds.has(change.id)) {
            shouldFullRescan = true;
            break;
          }
          continue;
        }

        if (change.type === 'CREATE') {
          if (scopeSet.size > 0 && await isNodeWithinScope(change.id, scopeSet)) {
            shouldFullRescan = true;
            break;
          }
          continue;
        }

        if (change.type === 'PROPERTY_CHANGE' && scannedIds.has(change.id)) {
          incrementalNodeIds.add(change.id);
          continue;
        }

        if (change.type === 'PROPERTY_CHANGE') {
          if (scopeSet.size > 0 && await isNodeWithinScope(change.id, scopeSet)) {
            incrementalNodeIds.add(change.id);
          }
          continue;
        }

        if (scannedIds.has(change.id)) {
          shouldFullRescan = true;
          break;
        }

        if (scopeSet.size > 0 && await isNodeWithinScope(change.id, scopeSet)) {
          shouldFullRescan = true;
          break;
        }
      }

      if (shouldFullRescan) {
        lastScanScopeId = scopeId;
        await performScan();
      } else if (incrementalNodeIds.size > 0) {
        try {
          await performIncrementalUpdate(incrementalNodeIds);
        } catch (error) {
          console.warn('Incremental update failed, falling back to full scan:', error);
          lastScanScopeId = scopeId;
          await performScan();
        }
      }
    }, 300) as unknown as number;
  });
}

async function initPlugin() {
  const settings = await loadSettings();
  includeVectors = settings.includeVectors;
  smoothZoom = settings.smoothZoom;
  colorDisplayFormat = settings.colorDisplayFormat;
  uiTheme = settings.uiTheme;

  const hasSelection = figma.currentPage.selection.length > 0;

  if (hasSelection) {
    lastScanScopeId = getScopeId();
    await performScan();
  } else {
    lastScanScopeId = null;
    sendNoSelectionState();
  }

  setupListeners();
}

initPlugin();
