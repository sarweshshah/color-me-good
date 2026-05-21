import { scanCurrentPage, scanNodesForColors, SCAN_CANCELLED_MESSAGE } from './scanner';
import { SerializedColorEntry, ColorEntry, ScanContext } from '../shared/types';
import { UIMessage, PluginSettings } from '../shared/messages';

const SETTINGS_STORAGE_KEY = 'color-me-good-settings';
const SESSION_STORAGE_KEY = 'color-me-good-session';

// Duplicated from shared/constants.ts — plugin code.js must be a single self-contained
// file with no cross-entry imports, so we can't share runtime values with the UI bundle.
const RESIZE_BOUNDS = {
  minWidth: 420,
  maxWidth: 540,
  minHeight: 720,
  maxHeight: 840,
} as const;

const VALID_FORMATS = ['hex', 'rgba', 'hsla', 'hsba'] as const;
const VALID_UI_THEMES = ['light', 'dark', 'system'] as const;

const DEFAULT_SETTINGS: PluginSettings = {
  includeVectors: false,
  includeHiddenLayers: false,
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
        'colorDisplayFormat' in loaded &&
        VALID_FORMATS.includes(
          loaded.colorDisplayFormat as (typeof VALID_FORMATS)[number]
        )
          ? loaded.colorDisplayFormat
          : 'hex';
      const theme =
        'uiTheme' in loaded &&
        VALID_UI_THEMES.includes(loaded.uiTheme as (typeof VALID_UI_THEMES)[number])
          ? loaded.uiTheme
          : 'system';
      return {
        includeVectors: Boolean(loaded.includeVectors),
        includeHiddenLayers: Boolean(
          'includeHiddenLayers' in loaded && loaded.includeHiddenLayers
        ),
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

interface SessionCache {
  scopeId: string;
  scopeNodeIds: string[];
  colors: SerializedColorEntry[];
  context: ScanContext;
}

async function saveSessionCache(
  scopeId: string,
  colors: SerializedColorEntry[],
  context: ScanContext
): Promise<void> {
  const scopeNodeIds = context.scopeNodeIds ?? [];
  if (scopeNodeIds.length === 0) return;
  try {
    await figma.clientStorage.setAsync(SESSION_STORAGE_KEY, {
      scopeId,
      scopeNodeIds,
      colors,
      context,
    });
  } catch (_) {}
}

async function clearSessionCache(): Promise<void> {
  try {
    await figma.clientStorage.deleteAsync(SESSION_STORAGE_KEY);
  } catch (_) {}
}

async function loadSessionCache(): Promise<SessionCache | null> {
  try {
    const raw = await figma.clientStorage.getAsync(SESSION_STORAGE_KEY);
    if (
      raw &&
      typeof raw === 'object' &&
      'scopeId' in raw &&
      'colors' in raw &&
      'context' in raw
    ) {
      const data = raw as SessionCache;
      if (
        Array.isArray(data.colors) &&
        data.context &&
        Array.isArray(data.scopeNodeIds)
      ) {
        return data;
      }
    }
  } catch (_) {}
  return null;
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
let includeHiddenLayers = false;
let smoothZoom = true;
let colorDisplayFormat: PluginSettings['colorDisplayFormat'] = 'hex';
let uiTheme: PluginSettings['uiTheme'] = 'system';
let ignoreNextSelectionChange = false;
let zoomToNodeTimer: ReturnType<typeof setTimeout> | null = null;

figma.showUI(__html__, {
  width: RESIZE_BOUNDS.minWidth,
  height: RESIZE_BOUNDS.minHeight,
  themeColors: true,
});

figma.ui.onmessage = async (msg: UIMessage) => {
  switch (msg.type) {
    case 'select-nodes':
      await handleSelectNodes(msg.nodeIds, msg.append);
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
    case 'cancel-scan':
      if (selectionDebounce !== null) {
        clearTimeout(selectionDebounce);
        selectionDebounce = null;
      }
      currentScanId++;
      cachedResults = null;
      lastScanScopeId = null;
      sendNoSelectionState();
      break;
    case 'request-rescan':
      await performScan();
      break;
    case 'resize':
      figma.ui.resize(
        Math.max(RESIZE_BOUNDS.minWidth, Math.min(RESIZE_BOUNDS.maxWidth, msg.width)),
        Math.max(RESIZE_BOUNDS.minHeight, Math.min(RESIZE_BOUNDS.maxHeight, msg.height))
      );
      break;
    case 'get-settings':
      sendSettingsToUI({
        includeVectors,
        includeHiddenLayers,
        smoothZoom,
        colorDisplayFormat,
        uiTheme,
      });
      if (latestViewState) {
        figma.ui.postMessage({
          type: 'scan-complete',
          colors: latestViewState.colors,
          context: latestViewState.context,
        });
      }
      break;
    case 'set-setting': {
      const needsRescan =
        msg.key === 'includeVectors' || msg.key === 'includeHiddenLayers';
      if (msg.key === 'includeVectors') includeVectors = msg.value as boolean;
      else if (msg.key === 'includeHiddenLayers')
        includeHiddenLayers = msg.value as boolean;
      else if (msg.key === 'smoothZoom') smoothZoom = msg.value as boolean;
      else if (msg.key === 'colorDisplayFormat')
        colorDisplayFormat = msg.value as PluginSettings['colorDisplayFormat'];
      else if (msg.key === 'uiTheme') uiTheme = msg.value as PluginSettings['uiTheme'];
      const settings = {
        includeVectors,
        includeHiddenLayers,
        smoothZoom,
        colorDisplayFormat,
        uiTheme,
      };
      await saveSettings(settings);
      sendSettingsToUI(settings);
      if (needsRescan) await performScan();
      break;
    }
  }
};

async function handleSelectNodes(nodeIds: string[], append?: boolean): Promise<void> {
  try {
    const nodes = await Promise.all(nodeIds.map((id) => figma.getNodeByIdAsync(id)));
    const validNew = nodes.filter(
      (node): node is SceneNode => node !== null && 'id' in node
    );
    ignoreNextSelectionChange = true;

    let finalSelection: SceneNode[];
    if (append && figma.currentPage.selection.length > 0) {
      const seen = new Set<string>();
      finalSelection = [];
      for (const n of figma.currentPage.selection) {
        if (!seen.has(n.id)) {
          seen.add(n.id);
          finalSelection.push(n);
        }
      }
      for (const n of validNew) {
        if (!seen.has(n.id)) {
          seen.add(n.id);
          finalSelection.push(n);
        }
      }
    } else {
      finalSelection = validNew;
    }

    figma.currentPage.selection = finalSelection;

    if (finalSelection.length > 0) {
      figma.viewport.scrollAndZoomIntoView(finalSelection);
    }
  } catch (error) {
    console.error('Failed to select nodes:', error);
    figma.ui.postMessage({
      type: 'scan-error',
      message: 'Failed to select elements',
    });
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
      const eased = easeInOutCubic(t);

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

  figma.ui.postMessage({ type: 'scan-started' });

  try {
    const result = await scanCurrentPage({
      includeVectors,
      includeHiddenLayers,
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

    const scopeId = getScopeId();
    if (scopeId) {
      saveSessionCache(scopeId, serializedColors, result.context);
    }

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
    const scanned = await scanNodesForColors(nodes, {
      includeVectors,
      includeHiddenLayers,
    });
    const serialized = serializeColors(scanned);
    mergeColorsIntoCachedResults(serialized);
  }

  cachedResults.context = {
    ...cachedResults.context,
    timestamp: new Date().toISOString(),
  };
  latestViewState = cachedResults;

  const scopeId = getScopeId();
  if (scopeId) {
    saveSessionCache(scopeId, cachedResults.colors, cachedResults.context);
  }

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
  clearSessionCache();
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

async function isNodeWithinScope(
  nodeId: string,
  scopeIds: Set<string>,
  batchCache?: Map<string, boolean>
): Promise<boolean> {
  if (batchCache?.has(nodeId)) return batchCache.get(nodeId)!;
  try {
    let node: BaseNode | null = await figma.getNodeByIdAsync(nodeId);
    while (node) {
      if (scopeIds.has(node.id)) {
        batchCache?.set(nodeId, true);
        return true;
      }
      node = node.parent;
    }
  } catch {}
  batchCache?.set(nodeId, false);
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

    const currentScopeId = getScopeId();
    if (currentScopeId !== null && currentScopeId !== lastScanScopeId) {
      figma.ui.postMessage({ type: 'scan-started' });
    }

    if (selectionDebounce !== null) {
      clearTimeout(selectionDebounce);
    }

    selectionDebounce = setTimeout(async () => {
      selectionDebounce = null;
      const scopeId = getScopeId();
      if (scopeId !== lastScanScopeId) {
        lastScanScopeId = scopeId;
        if (scopeId === null) {
          sendNoSelectionState();
        } else {
          await performScan();
        }
      }
    }, 150) as unknown as number;
  });

  figma.on('documentchange', (event) => {
    for (const change of event.documentChanges) {
      if (
        change.type === 'CREATE' ||
        change.type === 'DELETE' ||
        change.type === 'PROPERTY_CHANGE'
      ) {
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
      const scopeCheckCache = new Map<string, boolean>();

      const deletions: string[] = [];
      const creates: string[] = [];
      const propChangesKnown: string[] = [];
      const propChangesUnknown: string[] = [];

      for (const change of changes) {
        if (change.type === 'DELETE') {
          if (scannedIds.has(change.id)) {
            shouldFullRescan = true;
            break;
          }
          deletions.push(change.id);
        } else if (change.type === 'CREATE') {
          creates.push(change.id);
        } else if (change.type === 'PROPERTY_CHANGE') {
          if (scannedIds.has(change.id)) {
            propChangesKnown.push(change.id);
          } else {
            propChangesUnknown.push(change.id);
          }
        }
      }

      if (!shouldFullRescan && creates.length > 0 && scopeSet.size > 0) {
        const results = await Promise.all(
          creates.map((id) => isNodeWithinScope(id, scopeSet, scopeCheckCache))
        );
        if (results.some(Boolean)) {
          shouldFullRescan = true;
        }
      }

      if (!shouldFullRescan) {
        for (const id of propChangesKnown) {
          incrementalNodeIds.add(id);
        }

        if (propChangesUnknown.length > 0 && scopeSet.size > 0) {
          const results = await Promise.all(
            propChangesUnknown.map((id) => isNodeWithinScope(id, scopeSet, scopeCheckCache))
          );
          for (let i = 0; i < propChangesUnknown.length; i++) {
            if (results[i]) {
              incrementalNodeIds.add(propChangesUnknown[i]);
            }
          }
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
  includeHiddenLayers = settings.includeHiddenLayers;
  smoothZoom = settings.smoothZoom;
  colorDisplayFormat = settings.colorDisplayFormat;
  uiTheme = settings.uiTheme;

  const scopeId = getScopeId();

  if (scopeId !== null) {
    const session = await loadSessionCache();
    if (session && session.scopeId === scopeId) {
      cachedResults = { colors: session.colors, context: session.context };
      latestViewState = cachedResults;
      lastScanScopeId = scopeId;
      figma.ui.postMessage({
        type: 'scan-complete',
        colors: session.colors,
        context: session.context,
      });
      setupListeners();
      return;
    }
    lastScanScopeId = scopeId;
    await performScan();
  } else {
    lastScanScopeId = null;
    sendNoSelectionState();
  }

  setupListeners();
}

initPlugin();
