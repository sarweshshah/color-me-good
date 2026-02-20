import {
  ColorEntry,
  NodeRef,
  ScanContext,
  PropertyType,
  GradientData,
  GradientType,
} from '../shared/types';
import { rgbaToHex, hashGradient, buildLayerPath } from './utils';
import { resolveVariableBinding } from './variable-resolver';

const VECTOR_NODE_TYPES: Set<string> = new Set([
  'VECTOR',
  'LINE',
  'STAR',
  'POLYGON',
  'ELLIPSE',
  'BOOLEAN_OPERATION',
]);

export interface ScanOptions {
  onProgress?: (scanned: number, total: number) => void;
  onError?: (error: Error) => void;
  includeVectors?: boolean;
  /** When true, the scan should abort (e.g. selection changed). */
  isCancelled?: () => boolean;
}

export const SCAN_CANCELLED_MESSAGE = 'SCAN_CANCELLED';

interface ColorMap {
  [dedupKey: string]: ColorEntry;
}

export async function scanCurrentPage(
  options: ScanOptions = {}
): Promise<{ colors: ColorEntry[]; context: ScanContext }> {
  const colorMap: ColorMap = {};

  const context = resolveScanContext();

  let rootNodes: SceneNode[];
  if (context.mode === 'selection' && context.scopeNodeIds) {
    const resolved = await Promise.all(
      context.scopeNodeIds.map((id) => figma.getNodeByIdAsync(id))
    );
    rootNodes = resolved.filter((n): n is SceneNode => n !== null);
  } else {
    rootNodes = figma.currentPage.children as SceneNode[];
  }

  let totalNodes = 0;
  let scannedNodes = 0;

  function countNodes(node: SceneNode): number {
    if ('visible' in node && !node.visible) return 0;
    let count = 1;
    if ('children' in node) {
      for (const child of node.children) {
        count += countNodes(child as SceneNode);
      }
    }
    return count;
  }

  for (const root of rootNodes) {
    if (root) {
      totalNodes += countNodes(root);
    }
  }

  if (totalNodes > 50000) {
    figma.notify(
      'Large page detected. Consider scoping to a selection for faster results.',
      { timeout: 5000 }
    );
  }

  async function* traverseNodes(node: SceneNode): AsyncGenerator<SceneNode> {
    if ('visible' in node && !node.visible) return;

    yield node;
    scannedNodes++;

    if (scannedNodes % 500 === 0) {
      if (options.isCancelled?.()) return;
      if (options.onProgress) {
        options.onProgress(scannedNodes, totalNodes);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    if ('children' in node) {
      for (const child of node.children) {
        yield* traverseNodes(child as SceneNode);
      }
    }
  }

  try {
    for (const root of rootNodes) {
      if (!root) continue;
      if (options.isCancelled?.()) throw new Error(SCAN_CANCELLED_MESSAGE);

      for await (const node of traverseNodes(root)) {
        if (options.isCancelled?.()) throw new Error(SCAN_CANCELLED_MESSAGE);
        if (!options.includeVectors && VECTOR_NODE_TYPES.has(node.type)) continue;
        await extractColorsFromNode(node, colorMap);
      }
    }

    if (options.onProgress) {
      options.onProgress(totalNodes, totalNodes);
    }

    const colors = Object.values(colorMap);
    
    context.totalNodesScanned = scannedNodes;
    context.timestamp = new Date().toISOString();

    return { colors, context };
  } catch (error) {
    if (options.onError) {
      options.onError(error as Error);
    }
    throw error;
  }
}

function resolveScanContext(): ScanContext {
  const selection = figma.currentPage.selection;

  if (selection.length >= 1) {
    const ids = selection.map((n) => n.id);
    const name =
      selection.length === 1
        ? selection[0].name
        : `${selection.length} elements`;
    return {
      mode: 'selection',
      scopeNodeId: ids[0],
      scopeNodeIds: ids,
      scopeNodeName: name,
      scopeNodeType: selection.length === 1 ? selection[0].type : null,
      totalNodesScanned: 0,
      timestamp: '',
    };
  }

  return {
    mode: 'page',
    scopeNodeId: null,
    scopeNodeIds: null,
    scopeNodeName: null,
    scopeNodeType: null,
    totalNodesScanned: 0,
    timestamp: '',
  };
}

async function extractColorsFromNode(
  node: SceneNode,
  colorMap: ColorMap
): Promise<void> {
  try {
    const layerPath = buildLayerPath(node);

    if ('fills' in node && Array.isArray(node.fills)) {
      for (let i = 0; i < node.fills.length; i++) {
        const paint = node.fills[i];
        if (paint.type === 'SOLID' && paint.visible !== false) {
          await addSolidColor(
            paint,
            'fill',
            i,
            node,
            layerPath,
            colorMap,
            node.boundVariables?.fills?.[i]
          );
        } else if (
          (paint.type === 'GRADIENT_LINEAR' ||
            paint.type === 'GRADIENT_RADIAL' ||
            paint.type === 'GRADIENT_ANGULAR' ||
            paint.type === 'GRADIENT_DIAMOND') &&
          paint.visible !== false
        ) {
          await addGradientColor(paint, 'fill', i, node, layerPath, colorMap);
        }
      }
    }

    if ('strokes' in node && Array.isArray(node.strokes)) {
      for (let i = 0; i < node.strokes.length; i++) {
        const paint = node.strokes[i];
        if (paint.type === 'SOLID' && paint.visible !== false) {
          await addSolidColor(
            paint,
            'stroke',
            i,
            node,
            layerPath,
            colorMap,
            node.boundVariables?.strokes?.[i]
          );
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to extract colors from node ${node.id}:`, error);
  }
}

async function addSolidColor(
  paint: SolidPaint,
  propertyType: PropertyType,
  propertyIndex: number,
  node: SceneNode,
  layerPath: string,
  colorMap: ColorMap,
  boundVariable?: VariableAlias | VariableAlias[]
): Promise<void> {
  const rgba = {
    r: paint.color.r,
    g: paint.color.g,
    b: paint.color.b,
    a: paint.opacity ?? 1,
  };

  const hex = rgbaToHex(rgba);
  const tokenInfo = await resolveVariableBinding(boundVariable);
  // Same resolved color with different bound tokens = separate rows (fixes wrong token at page scope)
  const dedupKey = tokenInfo ? `${hex}|${tokenInfo.tokenName}` : hex;

  const nodeRef: NodeRef = {
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    layerPath,
    propertyType,
    propertyIndex,
  };

  if (!colorMap[dedupKey]) {
    colorMap[dedupKey] = {
      type: 'solid',
      hex,
      rgba,
      gradient: null,
      dedupKey,
      tokenName: tokenInfo?.tokenName ?? null,
      tokenCollection: tokenInfo?.tokenCollection ?? null,
      libraryName: tokenInfo?.libraryName ?? null,
      isLibraryVariable: tokenInfo?.isLibraryVariable ?? false,
      styleName: null,
      styleId: null,
      propertyTypes: new Set([propertyType]),
      nodes: [nodeRef],
      usageCount: 1,
      isTokenBound: !!tokenInfo,
    };
  } else {
    const entry = colorMap[dedupKey];
    entry.propertyTypes.add(propertyType);
    entry.nodes.push(nodeRef);
    entry.usageCount++;
  }
}

async function addGradientColor(
  paint: GradientPaint,
  propertyType: PropertyType,
  propertyIndex: number,
  node: SceneNode,
  layerPath: string,
  colorMap: ColorMap
): Promise<void> {
  const gradientTypeMap: { [key: string]: GradientType } = {
    GRADIENT_LINEAR: 'LINEAR',
    GRADIENT_RADIAL: 'RADIAL',
    GRADIENT_ANGULAR: 'ANGULAR',
    GRADIENT_DIAMOND: 'DIAMOND',
  };

  const gradientData: GradientData = {
    gradientType: gradientTypeMap[paint.type],
    stops: paint.gradientStops.map((stop) => ({
      color: {
        r: stop.color.r,
        g: stop.color.g,
        b: stop.color.b,
        a: stop.color.a ?? 1,
      },
      position: stop.position,
    })),
    transform: paint.gradientTransform,
  };

  const dedupKey = hashGradient(gradientData);

  const nodeRef: NodeRef = {
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    layerPath,
    propertyType,
    propertyIndex,
  };

  if (!colorMap[dedupKey]) {
    colorMap[dedupKey] = {
      type: 'gradient',
      hex: null,
      rgba: null,
      gradient: gradientData,
      dedupKey,
      tokenName: null,
      tokenCollection: null,
      libraryName: null,
      isLibraryVariable: false,
      styleName: null,
      styleId: null,
      propertyTypes: new Set([propertyType]),
      nodes: [nodeRef],
      usageCount: 1,
      isTokenBound: false,
    };
  } else {
    const entry = colorMap[dedupKey];
    entry.propertyTypes.add(propertyType);
    entry.nodes.push(nodeRef);
    entry.usageCount++;
  }
}

