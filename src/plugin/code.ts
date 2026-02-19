import { scanCurrentPage } from './scanner';
import { SerializedColorEntry, ColorEntry, ScanContext } from '../shared/types';
import { UIMessage } from '../shared/messages';

let cachedResults: {
  colors: SerializedColorEntry[];
  context: ScanContext;
} | null = null;

let selectionDebounce: number | null = null;
let documentDebounce: number | null = null;
let isScanning = false;
let includeVectors = false;
let ignoreNextSelectionChange = false;

figma.showUI(__html__, {
  width: 560,
  height: 640,
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
        Math.max(360, Math.min(800, msg.width)),
        Math.max(560, Math.min(840, msg.height))
      );
      break;
    case 'set-include-vectors':
      includeVectors = msg.includeVectors;
      await performScan();
      break;
  }
};

async function handleSelectNodes(nodeIds: string[]): Promise<void> {
  try {
    const nodes = await Promise.all(
      nodeIds.map((id) => figma.getNodeByIdAsync(id))
    );
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

async function handleZoomToNode(nodeId: string): Promise<void> {
  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (node && 'id' in node) {
      ignoreNextSelectionChange = true;
      figma.currentPage.selection = [node as SceneNode];
      figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
    }
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
  return sel.map((n) => n.id).sort().join(',');
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
          (change) =>
            change.type === 'DELETE' &&
            scopeNodeIds.includes(change.id)
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
