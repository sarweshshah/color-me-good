import {
  ColorEntry,
  NodeRef,
  ScanContext,
  PropertyType,
  GradientData,
  GradientType,
} from '../shared/types';
import { rgbaToHex, hashGradient, buildLayerPath } from './utils';
import { resolveVariableBinding, VariableResolverCache } from './variable-resolver';

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
  includeBooleanChildren?: boolean;
  expandGradients?: boolean;
  includeHiddenLayers?: boolean;
  /** When true, the scan should abort (e.g. selection changed). */
  isCancelled?: () => boolean;
}

export const SCAN_CANCELLED_MESSAGE = 'SCAN_CANCELLED';

interface ColorMap {
  [dedupKey: string]: ColorEntry;
}

interface TextSegmentRange {
  characterStart: number;
  characterEnd: number;
}

export async function scanCurrentPage(
  options: ScanOptions = {}
): Promise<{ colors: ColorEntry[]; context: ScanContext }> {
  const colorMap: ColorMap = {};
  const resolverCache = new VariableResolverCache();

  const context = resolveScanContext();

  if (!context.scopeNodeIds || context.scopeNodeIds.length === 0) {
    return { colors: [], context };
  }

  const resolved = await Promise.all(
    context.scopeNodeIds.map((id) => figma.getNodeByIdAsync(id))
  );
  const rootNodes = resolved.filter((n): n is SceneNode => n !== null);

  let totalNodes = 0;
  let scannedNodes = 0;
  const includeHidden = options.includeHiddenLayers ?? false;
  const includeBooleanChildren = options.includeBooleanChildren ?? false;
  const expandGradients = options.expandGradients ?? false;

  function countNodes(node: SceneNode): number {
    if (!includeHidden && 'visible' in node && !node.visible) return 0;
    let count = 1;
    if ('children' in node && (includeBooleanChildren || node.type !== 'BOOLEAN_OPERATION')) {
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

  if (options.onProgress) {
    options.onProgress(0, totalNodes);
  }

  async function* traverseNodes(node: SceneNode): AsyncGenerator<SceneNode> {
    if (!includeHidden && 'visible' in node && !node.visible) return;

    yield node;
    scannedNodes++;

    if (scannedNodes % 100 === 0) {
      if (options.onProgress) {
        options.onProgress(scannedNodes, totalNodes);
      }
      // Yield to the macrotask queue so UI messages (e.g. cancel) can be delivered.
      await new Promise((resolve) => setTimeout(resolve, 0));
      // Check AFTER the yield — the cancel message may have arrived during the await.
      if (options.isCancelled?.()) throw new Error(SCAN_CANCELLED_MESSAGE);
    }

    if ('children' in node && (includeBooleanChildren || node.type !== 'BOOLEAN_OPERATION')) {
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
        await extractColorsFromNode(node, colorMap, resolverCache, expandGradients);
        if (options.isCancelled?.()) throw new Error(SCAN_CANCELLED_MESSAGE);
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

export async function scanNodesForColors(
  nodes: SceneNode[],
  options: { includeVectors?: boolean; includeBooleanChildren?: boolean; expandGradients?: boolean; includeHiddenLayers?: boolean } = {}
): Promise<ColorEntry[]> {
  const colorMap: ColorMap = {};
  const resolverCache = new VariableResolverCache();
  const includeHidden = options.includeHiddenLayers ?? false;
  const expandGradients = options.expandGradients ?? false;

  for (const node of nodes) {
    if (!node) continue;
    if (!includeHidden && 'visible' in node && !node.visible) continue;
    if (!options.includeVectors && VECTOR_NODE_TYPES.has(node.type)) continue;
    await extractColorsFromNode(node, colorMap, resolverCache, expandGradients);
  }

  return Object.values(colorMap);
}

function resolveScanContext(): ScanContext {
  const selection = figma.currentPage.selection;
  const ids = selection.map((n) => n.id);
  const name =
    selection.length === 1
      ? selection[0].name
      : selection.length > 1
        ? `${selection.length} elements`
        : null;
  return {
    mode: 'selection',
    scopeNodeId: ids[0] ?? null,
    scopeNodeIds: ids.length > 0 ? ids : null,
    scopeNodeName: name,
    scopeNodeType: selection.length === 1 ? selection[0].type : null,
    totalNodesScanned: 0,
    timestamp: '',
  };
}

async function extractColorsFromNode(
  node: SceneNode,
  colorMap: ColorMap,
  resolverCache?: VariableResolverCache,
  expandGradients = false
): Promise<void> {
  try {
    const layerPath = buildLayerPath(node);
    const fillPropertyType: PropertyType = node.type === 'TEXT' ? 'text' : 'fill';

    if (node.type === 'TEXT') {
      await extractTextSegmentColors(
        node as TextNode,
        layerPath,
        colorMap,
        resolverCache,
        expandGradients
      );
    } else if ('fills' in node && Array.isArray(node.fills)) {
      for (let i = 0; i < node.fills.length; i++) {
        const paint = node.fills[i];
        if (paint.type === 'SOLID' && paint.visible !== false) {
          await addSolidColor(
            paint,
            fillPropertyType,
            i,
            node,
            layerPath,
            colorMap,
            node.boundVariables?.fills?.[i],
            resolverCache
          );
        } else if (
          (paint.type === 'GRADIENT_LINEAR' ||
            paint.type === 'GRADIENT_RADIAL' ||
            paint.type === 'GRADIENT_ANGULAR' ||
            paint.type === 'GRADIENT_DIAMOND') &&
          paint.visible !== false
        ) {
          if (expandGradients) {
            addGradientStopsAsSolids(paint, fillPropertyType, i, node, layerPath, colorMap);
          } else {
            await addGradientColor(paint, fillPropertyType, i, node, layerPath, colorMap);
          }
        }
      }
    } else if ('fills' in node && 'vectorNetwork' in node) {
      try {
        const regions = (node as any).vectorNetwork?.regions as any[] | undefined;
        if (regions) {
          for (let r = 0; r < regions.length; r++) {
            const regionFills = regions[r]?.fills as Paint[] | undefined;
            if (!Array.isArray(regionFills)) continue;
            for (let i = 0; i < regionFills.length; i++) {
              const paint = regionFills[i];
              if (paint.type === 'SOLID' && paint.visible !== false) {
                await addSolidColor(paint, fillPropertyType, i, node, layerPath, colorMap, undefined, resolverCache);
              } else if (
                (paint.type === 'GRADIENT_LINEAR' ||
                  paint.type === 'GRADIENT_RADIAL' ||
                  paint.type === 'GRADIENT_ANGULAR' ||
                  paint.type === 'GRADIENT_DIAMOND') &&
                paint.visible !== false
              ) {
                if (expandGradients) {
                  addGradientStopsAsSolids(paint as GradientPaint, fillPropertyType, i, node, layerPath, colorMap);
                } else {
                  await addGradientColor(paint as GradientPaint, fillPropertyType, i, node, layerPath, colorMap);
                }
              }
            }
          }
        }
      } catch (_) {}
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
            node.boundVariables?.strokes?.[i],
            resolverCache
          );
        }
      }
    }

    if ('effects' in node && Array.isArray(node.effects)) {
      for (let i = 0; i < node.effects.length; i++) {
        const effect = node.effects[i];
        if (
          (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') &&
          effect.visible !== false
        ) {
          const syntheticPaint: SolidPaint = {
            type: 'SOLID',
            color: { r: effect.color.r, g: effect.color.g, b: effect.color.b },
            opacity: effect.color.a,
            visible: true,
          };
          await addSolidColor(
            syntheticPaint,
            'effect',
            i,
            node,
            layerPath,
            colorMap,
            node.boundVariables?.effects?.[i],
            resolverCache
          );
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to extract colors from node ${node.id}:`, error);
  }
}

async function extractTextSegmentColors(
  textNode: TextNode,
  layerPath: string,
  colorMap: ColorMap,
  resolverCache?: VariableResolverCache,
  expandGradients = false
): Promise<void> {
  const segments = textNode.getStyledTextSegments(['fills']);

  for (const segment of segments) {
    if (segment.start >= segment.end) continue;

    const segmentRange: TextSegmentRange = {
      characterStart: segment.start,
      characterEnd: segment.end,
    };

    for (let i = 0; i < segment.fills.length; i++) {
      const paint = segment.fills[i];
      const boundVariable =
        paint.type === 'SOLID'
          ? paint.boundVariables?.color ?? textNode.boundVariables?.fills?.[i]
          : textNode.boundVariables?.fills?.[i];

      if (paint.type === 'SOLID' && paint.visible !== false) {
        await addSolidColor(
          paint,
          'text',
          i,
          textNode,
          layerPath,
          colorMap,
          boundVariable,
          resolverCache,
          segmentRange
        );
      } else if (
        (paint.type === 'GRADIENT_LINEAR' ||
          paint.type === 'GRADIENT_RADIAL' ||
          paint.type === 'GRADIENT_ANGULAR' ||
          paint.type === 'GRADIENT_DIAMOND') &&
        paint.visible !== false
      ) {
        if (expandGradients) {
          addGradientStopsAsSolids(
            paint,
            'text',
            i,
            textNode,
            layerPath,
            colorMap,
            segmentRange
          );
        } else {
          await addGradientColor(
            paint,
            'text',
            i,
            textNode,
            layerPath,
            colorMap,
            segmentRange
          );
        }
      }
    }
  }
}

async function addSolidColor(
  paint: SolidPaint,
  propertyType: PropertyType,
  propertyIndex: number,
  node: SceneNode,
  layerPath: string,
  colorMap: ColorMap,
  boundVariable?: VariableAlias | VariableAlias[],
  resolverCache?: VariableResolverCache,
  segment?: TextSegmentRange
): Promise<void> {
  const rgba = {
    r: paint.color.r,
    g: paint.color.g,
    b: paint.color.b,
    a: paint.opacity ?? 1,
  };

  const hex = rgbaToHex(rgba);
  const tokenInfo = await resolveVariableBinding(boundVariable, resolverCache);
  // Same resolved color with different bound tokens = separate rows (fixes wrong token at page scope)
  const dedupKey = tokenInfo ? `${hex}|${tokenInfo.tokenName}` : hex;

  const nodeRef = buildNodeRef(node, layerPath, propertyType, propertyIndex, segment);

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
  colorMap: ColorMap,
  segment?: TextSegmentRange
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

  const nodeRef = buildNodeRef(node, layerPath, propertyType, propertyIndex, segment);

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

function addGradientStopsAsSolids(
  paint: GradientPaint,
  propertyType: PropertyType,
  propertyIndex: number,
  node: SceneNode,
  layerPath: string,
  colorMap: ColorMap,
  segment?: TextSegmentRange
): void {
  const nodeRef = buildNodeRef(node, layerPath, propertyType, propertyIndex, segment);

  for (const stop of paint.gradientStops) {
    const rgba = {
      r: stop.color.r,
      g: stop.color.g,
      b: stop.color.b,
      a: stop.color.a ?? 1,
    };
    const hex = rgbaToHex(rgba);

    if (!colorMap[hex]) {
      colorMap[hex] = {
        type: 'solid',
        hex,
        rgba,
        gradient: null,
        dedupKey: hex,
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
      const entry = colorMap[hex];
      entry.propertyTypes.add(propertyType);
      if (
        !entry.nodes.some(
          (n) =>
            n.nodeId === nodeRef.nodeId &&
            n.propertyIndex === propertyIndex &&
            n.characterStart === nodeRef.characterStart &&
            n.characterEnd === nodeRef.characterEnd
        )
      ) {
        entry.nodes.push(nodeRef);
        entry.usageCount++;
      }
    }
  }
}

function buildNodeRef(
  node: SceneNode,
  layerPath: string,
  propertyType: PropertyType,
  propertyIndex: number,
  segment?: TextSegmentRange
): NodeRef {
  return {
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    layerPath,
    propertyType,
    propertyIndex,
    ...(segment
      ? {
          characterStart: segment.characterStart,
          characterEnd: segment.characterEnd,
        }
      : {}),
    visible: 'visible' in node ? node.visible : true,
  };
}

