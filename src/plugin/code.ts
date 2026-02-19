import { scanCurrentPage } from './scanner';
import { SerializedColorEntry, ColorEntry, ScanContext } from '../shared/types';
import { UIMessage } from '../shared/messages';

let cachedResults: {
  colors: SerializedColorEntry[];
  context: ScanContext;
} | null = null;

let debounceTimer: number | null = null;
let isScanning = false;

figma.showUI(__html__, {
  width: 1080,
  height: 840,
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
      figma.currentPage.selection = [];
      await performScan();
      break;
    case 'request-rescan':
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

function setupDocumentChangeListener(): void {
  figma.on('documentchange', (event) => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      const currentSelection = figma.currentPage.selection;
      const currentScopeId =
        currentSelection.length === 1 &&
        (currentSelection[0].type === 'FRAME' ||
          currentSelection[0].type === 'SECTION' ||
          currentSelection[0].type === 'GROUP')
          ? currentSelection[0].id
          : null;

      const scopeChanged = currentScopeId !== lastScanScopeId;

      const scopeNodeId = cachedResults?.context.scopeNodeId;
      
      if (
        cachedResults &&
        scopeNodeId &&
        event.documentChanges.some(
          (change) =>
            change.type === 'DELETE' &&
            change.id === scopeNodeId
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

      if (scopeChanged) {
        lastScanScopeId = currentScopeId;
        await performScan();
      } else {
        await performScan();
      }
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

  setupDocumentChangeListener();
}

initPlugin();
