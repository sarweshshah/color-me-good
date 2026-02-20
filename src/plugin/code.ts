import { scanCurrentPage } from './scanner';
import { SerializedColorEntry, ColorEntry, ScanContext } from '../shared/types';
import { UIMessage, PluginSettings } from '../shared/messages';

const SETTINGS_STORAGE_KEY = 'color-inspector-settings';

const DEFAULT_SETTINGS: PluginSettings = {
  includeVectors: false,
  smoothZoom: true,
};

async function loadSettings(): Promise<PluginSettings> {
  try {
    const raw = await figma.clientStorage.getAsync(SETTINGS_STORAGE_KEY);
    if (raw && typeof raw === 'object' && 'includeVectors' in raw && 'smoothZoom' in raw) {
      return {
        includeVectors: Boolean((raw as PluginSettings).includeVectors),
        smoothZoom: Boolean((raw as PluginSettings).smoothZoom),
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

let selectionDebounce: number | null = null;
let documentDebounce: number | null = null;
let isScanning = false;
let includeVectors = false;
let smoothZoom = true;
let ignoreNextSelectionChange = false;
let zoomToNodeTimer: ReturnType<typeof setTimeout> | null = null;

figma.showUI(__html__, {
  width: 440,
  height: 720,
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
      await performScan();
      break;
    case 'request-rescan':
      await performScan();
      break;
    case 'resize':
      figma.ui.resize(
        Math.max(420, Math.min(800, msg.width)),
        Math.max(750, Math.min(840, msg.height))
      );
      break;
    case 'set-include-vectors':
      includeVectors = msg.includeVectors;
      await saveSettings({ includeVectors, smoothZoom });
      sendSettingsToUI({ includeVectors, smoothZoom });
      await performScan();
      break;
    case 'get-settings':
      sendSettingsToUI({ includeVectors, smoothZoom });
      break;
    case 'set-setting':
      if (msg.key === 'includeVectors') {
        includeVectors = msg.value;
        await saveSettings({ includeVectors, smoothZoom });
        sendSettingsToUI({ includeVectors, smoothZoom });
        await performScan();
      } else if (msg.key === 'smoothZoom') {
        smoothZoom = msg.value;
        await saveSettings({ includeVectors, smoothZoom });
        sendSettingsToUI({ includeVectors, smoothZoom });
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

    const bounds = 'absoluteBoundingBox' in sceneNode ? (sceneNode as LayoutMixin).absoluteBoundingBox : null;

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
      startZoom * vp.width / (bounds.width + pad),
      startZoom * vp.height / (bounds.height + pad)
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
  if (isScanning) return;
  isScanning = true;

  try {
    const result = await scanCurrentPage({
      includeVectors,
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

    figma.ui.postMessage({
      type: 'scan-complete',
      colors: serializedColors,
      context: result.context,
    });
  } catch (error) {
    console.error('Scan failed:', error);
    figma.ui.postMessage({
      type: 'scan-error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    isScanning = false;
  }
}

function serializeColors(colors: ColorEntry[]): SerializedColorEntry[] {
  return colors.map((color) => ({
    ...color,
    propertyTypes: Array.from(color.propertyTypes),
  }));
}

let lastScanScopeId: string | null = null;

function getScopeId(): string | null {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) return null;
  if (sel.length === 1) return sel[0].id;
  return sel
    .map((n) => n.id)
    .sort()
    .join(',');
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
        await performScan();
      }
    }, 300) as unknown as number;
  });

  figma.on('documentchange', (event) => {
    if (documentDebounce !== null) {
      clearTimeout(documentDebounce);
    }

    documentDebounce = setTimeout(async () => {
      documentDebounce = null;
      const scopeNodeIds = cachedResults?.context.scopeNodeIds;

      if (
        cachedResults &&
        scopeNodeIds &&
        event.documentChanges.some(
          (change) => change.type === 'DELETE' && scopeNodeIds.includes(change.id)
        )
      ) {
        figma.currentPage.selection = [];
        lastScanScopeId = null;
        await performScan();
        figma.ui.postMessage({
          type: 'scan-error',
          message: 'Scoped element was deleted. Showing full-page results.',
        });
        return;
      }

      lastScanScopeId = getScopeId();
      await performScan();
    }, 300) as unknown as number;
  });
}

async function initPlugin() {
  const settings = await loadSettings();
  includeVectors = settings.includeVectors;
  smoothZoom = settings.smoothZoom;

  if (cachedResults && cachedResults.colors && cachedResults.context) {
    figma.ui.postMessage({
      type: 'scan-complete',
      colors: cachedResults.colors,
      context: cachedResults.context,
    });
  } else {
    await performScan();
  }

  lastScanScopeId = getScopeId();
  setupListeners();
}

initPlugin();
