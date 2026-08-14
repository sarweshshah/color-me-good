import {
  ColorEntry,
  NodeRef,
  ScanContext,
  PropertyType,
  GradientData,
  GradientType,
} from '../shared/types';
import { mergeNodeRefIntoEntry, countUniqueElements } from './nodeRefs';
import { rgbaToHex, hashGradient, buildLayerPath } from './utils';
import {
  loadNodePaintStyles,
  NodePaintStyles,
  resolveGradientStopBindingFromStyles,
  resolveSolidPaintBindingFromStyles,
  StyleResolverCache,
} from './paint-binding-resolver';
import { VariableResolverCache } from './variable-resolver';
import type { TokenInfo } from './variable-resolver';

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

const SCAN_BATCH_SIZE = 500;

const GRADIENT_PAINT_TYPES: Set<string> = new Set([
  'GRADIENT_LINEAR',
  'GRADIENT_RADIAL',
  'GRADIENT_ANGULAR',
  'GRADIENT_DIAMOND',
]);

type ChildrenContainer = SceneNode & {
  findAll: (callback?: (node: SceneNode) => boolean) => SceneNode[];
};

function safeNodeVisible(node: SceneNode): boolean {
  if (!('visible' in node)) return true;
  try {
    return node.visible;
  } catch {
    // Instance sublayers can be inaccessible when skipInvisibleInstanceChildren is on.
    return false;
  }
}

function isVisibleForScan(node: SceneNode, includeHidden: boolean): boolean {
  return includeHidden || safeNodeVisible(node);
}

/** Stack-based walk that skips boolean subtrees — avoids stack overflow and wasted work. */
function collectScanNodesIterative(
  roots: SceneNode[],
  includeHidden: boolean
): SceneNode[] {
  const nodes: SceneNode[] = [];
  const stack = [...roots].reverse();

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (!isVisibleForScan(node, includeHidden)) continue;

    nodes.push(node);

    if (!('children' in node) || node.type === 'BOOLEAN_OPERATION') continue;

    const children = node.children;
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i] as SceneNode);
    }
  }

  return nodes;
}

/** Native Figma traversal — fastest when the full subtree must be walked. */
function collectScanNodesViaFindAll(
  roots: SceneNode[],
  includeHidden: boolean
): SceneNode[] {
  const matchesCriteria = (node: SceneNode) => isVisibleForScan(node, includeHidden);

  const nodes: SceneNode[] = [];
  for (const root of roots) {
    if (matchesCriteria(root)) nodes.push(root);
    if ('findAll' in root) {
      nodes.push(...(root as ChildrenContainer).findAll(matchesCriteria));
    }
  }
  return nodes;
}

function collectScanNodes(
  roots: SceneNode[],
  includeHidden: boolean,
  includeBooleanChildren: boolean
): SceneNode[] {
  if (includeBooleanChildren) {
    return collectScanNodesViaFindAll(roots, includeHidden);
  }
  return collectScanNodesIterative(roots, includeHidden);
}

function isGradientPaint(paint: Paint): paint is GradientPaint {
  return GRADIENT_PAINT_TYPES.has(paint.type);
}

function hasVisibleSolidOrGradientPaints(
  paints: readonly Paint[] | typeof figma.mixed
): boolean {
  if (!Array.isArray(paints)) return false;
  for (const paint of paints) {
    if (paint.visible === false) continue;
    if (paint.type === 'SOLID' || isGradientPaint(paint)) return true;
  }
  return false;
}

function hasVisibleShadowEffects(effects: readonly Effect[]): boolean {
  for (const effect of effects) {
    if (effect.visible === false) continue;
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') return true;
  }
  return false;
}

function nodeMayHaveColors(node: SceneNode): boolean {
  if (node.type === 'TEXT') return true;
  if ('vectorNetwork' in node) return true;
  if ('fills' in node && hasVisibleSolidOrGradientPaints(node.fills)) return true;
  if ('strokes' in node && hasVisibleSolidOrGradientPaints(node.strokes)) return true;
  if ('effects' in node && hasVisibleShadowEffects(node.effects)) return true;
  return false;
}

function addVariableId(
  alias: VariableAlias | VariableAlias[] | undefined,
  ids: Set<string>
): void {
  if (!alias) return;
  const resolved = Array.isArray(alias) ? alias[0] : alias;
  if (resolved?.type === 'VARIABLE_ALIAS') ids.add(resolved.id);
}

function collectStyleIdsFromNode(node: SceneNode, styleIds: Set<string>): void {
  if ('fillStyleId' in node) {
    const id = node.fillStyleId;
    if (typeof id === 'string' && id) styleIds.add(id);
  }
  if ('strokeStyleId' in node) {
    const id = node.strokeStyleId;
    if (typeof id === 'string' && id) styleIds.add(id);
  }
}

function collectVariableIdsFromPaints(
  paints: readonly Paint[] | typeof figma.mixed,
  variableIds: Set<string>
): void {
  if (!Array.isArray(paints)) return;
  for (const paint of paints) {
    if (paint.type === 'SOLID') {
      addVariableId(paint.boundVariables?.color, variableIds);
    } else if (isGradientPaint(paint)) {
      for (const stop of paint.gradientStops) {
        addVariableId(stop.boundVariables?.color, variableIds);
      }
    }
  }
}

function collectVariableIdsFromStyle(style: PaintStyle, variableIds: Set<string>): void {
  if (style.boundVariables?.paints) {
    for (const binding of style.boundVariables.paints) {
      addVariableId(binding, variableIds);
    }
  }
  collectVariableIdsFromPaints(style.paints, variableIds);
}

function collectVariableIdsFromNode(node: SceneNode, variableIds: Set<string>): void {
  const boundVariables = node.boundVariables;
  if (boundVariables) {
    for (const field of ['fills', 'strokes', 'effects'] as const) {
      const bindings = boundVariables[field];
      if (!bindings) continue;
      for (const binding of bindings) {
        addVariableId(binding, variableIds);
      }
    }
  }

  if ('fills' in node) collectVariableIdsFromPaints(node.fills, variableIds);
  if ('strokes' in node) collectVariableIdsFromPaints(node.strokes, variableIds);
}

async function warmCachesForBatch(
  nodes: SceneNode[],
  styleCache: StyleResolverCache,
  resolverCache: VariableResolverCache
): Promise<void> {
  const styleIds = new Set<string>();
  const variableIds = new Set<string>();

  for (const node of nodes) {
    collectStyleIdsFromNode(node, styleIds);
    collectVariableIdsFromNode(node, variableIds);
  }

  await styleCache.prefetchStyles(styleIds);

  for (const styleId of styleIds) {
    const style = styleCache.getCachedStyle(styleId);
    if (style) collectVariableIdsFromStyle(style, variableIds);
  }

  await resolverCache.prefetchVariables(variableIds);
}

function getCachedLayerPath(node: SceneNode, cache: Map<string, string>): string {
  const cached = cache.get(node.id);
  if (cached) return cached;
  const path = buildLayerPath(node);
  cache.set(node.id, path);
  return path;
}

export async function scanCurrentPage(
  options: ScanOptions = {}
): Promise<{ colors: ColorEntry[]; context: ScanContext }> {
  const colorMap: ColorMap = {};
  const resolverCache = new VariableResolverCache();
  const styleCache = new StyleResolverCache();

  const context = resolveScanContext();

  if (!context.scopeNodeIds || context.scopeNodeIds.length === 0) {
    return { colors: [], context };
  }

  const resolved = await Promise.all(
    context.scopeNodeIds.map((id) => figma.getNodeByIdAsync(id))
  );
  const rootNodes = resolved.filter((n): n is SceneNode => n !== null);

  let scannedNodes = 0;
  const includeHidden = options.includeHiddenLayers ?? false;
  const includeBooleanChildren = options.includeBooleanChildren ?? false;
  const expandGradients = options.expandGradients ?? false;
  const layerPathCache = new Map<string, string>();

  const prevSkipInvisible = figma.skipInvisibleInstanceChildren;
  if (!includeHidden) {
    figma.skipInvisibleInstanceChildren = true;
  }

  try {
    if (options.isCancelled?.()) throw new Error(SCAN_CANCELLED_MESSAGE);

    const nodesToScan = collectScanNodes(
      rootNodes,
      includeHidden,
      includeBooleanChildren
    );
    const totalNodes = nodesToScan.length;

    if (totalNodes > 50000) {
      figma.notify(
        'Large page detected. Consider scoping to a selection for faster results.',
        { timeout: 5000 }
      );
    }

    if (options.onProgress) {
      options.onProgress(0, totalNodes);
    }

    for (let i = 0; i < nodesToScan.length; i += SCAN_BATCH_SIZE) {
      if (options.isCancelled?.()) throw new Error(SCAN_CANCELLED_MESSAGE);

      const batchEnd = Math.min(i + SCAN_BATCH_SIZE, nodesToScan.length);
      const batch = nodesToScan.slice(i, batchEnd);
      await warmCachesForBatch(batch, styleCache, resolverCache);

      for (const node of batch) {
        scannedNodes++;
        if (!options.includeVectors && VECTOR_NODE_TYPES.has(node.type)) continue;
        await extractColorsFromNode(
          node,
          colorMap,
          resolverCache,
          styleCache,
          expandGradients,
          layerPathCache
        );
      }

      if (options.onProgress) {
        options.onProgress(batchEnd, totalNodes);
      }

      if (batchEnd < nodesToScan.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
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
  } finally {
    figma.skipInvisibleInstanceChildren = prevSkipInvisible;
  }
}

export async function scanNodesForColors(
  nodes: SceneNode[],
  options: { includeVectors?: boolean; includeBooleanChildren?: boolean; expandGradients?: boolean; includeHiddenLayers?: boolean } = {}
): Promise<ColorEntry[]> {
  const colorMap: ColorMap = {};
  const resolverCache = new VariableResolverCache();
  const styleCache = new StyleResolverCache();
  const includeHidden = options.includeHiddenLayers ?? false;
  const expandGradients = options.expandGradients ?? false;
  const layerPathCache = new Map<string, string>();

  const nodesToProcess = nodes.filter((node) => {
    if (!node) return false;
    if (!includeHidden && 'visible' in node && !node.visible) return false;
    if (!options.includeVectors && VECTOR_NODE_TYPES.has(node.type)) return false;
    return true;
  });

  if (nodesToProcess.length > 0) {
    await warmCachesForBatch(nodesToProcess, styleCache, resolverCache);
  }

  for (const node of nodesToProcess) {
    await extractColorsFromNode(
      node,
      colorMap,
      resolverCache,
      styleCache,
      expandGradients,
      layerPathCache
    );
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
  resolverCache: VariableResolverCache,
  styleCache: StyleResolverCache,
  expandGradients = false,
  layerPathCache: Map<string, string> = new Map()
): Promise<void> {
  try {
    if (!nodeMayHaveColors(node)) return;

    const layerPath = getCachedLayerPath(node, layerPathCache);
    const styles = await loadNodePaintStyles(node, styleCache);
    const fillPropertyType: PropertyType = node.type === 'TEXT' ? 'text' : 'fill';

    if (node.type === 'TEXT') {
      extractTextSegmentColors(
        node as TextNode,
        layerPath,
        colorMap,
        resolverCache,
        styles,
        expandGradients
      );
      return;
    }

    if ('fills' in node && Array.isArray(node.fills)) {
      for (let i = 0; i < node.fills.length; i++) {
        const paint = node.fills[i];
        if (paint.type === 'SOLID' && paint.visible !== false) {
          const boundVariable = resolveSolidPaintBindingFromStyles(
            node,
            'fills',
            i,
            paint,
            styles
          );
          addSolidColor(
            paint,
            fillPropertyType,
            i,
            node,
            layerPath,
            colorMap,
            boundVariable,
            resolverCache
          );
        } else if (isGradientPaint(paint) && paint.visible !== false) {
          if (expandGradients) {
            addGradientStopsAsSolids(
              paint,
              'fills',
              fillPropertyType,
              i,
              node,
              layerPath,
              colorMap,
              resolverCache,
              styles
            );
          } else {
            addGradientColor(paint, fillPropertyType, i, node, layerPath, colorMap);
          }
        }
      }
    } else if ('fills' in node && 'vectorNetwork' in node) {
      try {
        const regions = (node as VectorNode).vectorNetwork?.regions;
        if (regions) {
          for (let r = 0; r < regions.length; r++) {
            const regionFills = regions[r]?.fills;
            if (!Array.isArray(regionFills)) continue;
            for (let i = 0; i < regionFills.length; i++) {
              const paint = regionFills[i];
              if (paint.type === 'SOLID' && paint.visible !== false) {
                const boundVariable = resolveSolidPaintBindingFromStyles(
                  node,
                  'fills',
                  i,
                  paint,
                  styles
                );
                addSolidColor(
                  paint,
                  fillPropertyType,
                  i,
                  node,
                  layerPath,
                  colorMap,
                  boundVariable,
                  resolverCache
                );
              } else if (isGradientPaint(paint) && paint.visible !== false) {
                if (expandGradients) {
                  addGradientStopsAsSolids(
                    paint,
                    'fills',
                    fillPropertyType,
                    i,
                    node,
                    layerPath,
                    colorMap,
                    resolverCache,
                    styles
                  );
                } else {
                  addGradientColor(paint, fillPropertyType, i, node, layerPath, colorMap);
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
          const boundVariable = resolveSolidPaintBindingFromStyles(
            node,
            'strokes',
            i,
            paint,
            styles
          );
          addSolidColor(
            paint,
            'stroke',
            i,
            node,
            layerPath,
            colorMap,
            boundVariable,
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
          addSolidColor(
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

function extractTextSegmentColors(
  textNode: TextNode,
  layerPath: string,
  colorMap: ColorMap,
  resolverCache: VariableResolverCache,
  styles: NodePaintStyles,
  expandGradients = false
): void {
  const segments = textNode.getStyledTextSegments(['fills']);

  for (const segment of segments) {
    if (segment.start >= segment.end) continue;

    const segmentRange: TextSegmentRange = {
      characterStart: segment.start,
      characterEnd: segment.end,
    };

    for (let i = 0; i < segment.fills.length; i++) {
      const paint = segment.fills[i];

      if (paint.type === 'SOLID' && paint.visible !== false) {
        const boundVariable = resolveSolidPaintBindingFromStyles(
          textNode,
          'fills',
          i,
          paint,
          styles
        );
        addSolidColor(
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
      } else if (isGradientPaint(paint) && paint.visible !== false) {
        if (expandGradients) {
          addGradientStopsAsSolids(
            paint,
            'fills',
            'text',
            i,
            textNode,
            layerPath,
            colorMap,
            resolverCache,
            styles,
            segmentRange
          );
        } else {
          addGradientColor(
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

function addSolidColor(
  paint: SolidPaint,
  propertyType: PropertyType,
  propertyIndex: number,
  node: SceneNode,
  layerPath: string,
  colorMap: ColorMap,
  boundVariable?: VariableAlias | VariableAlias[],
  resolverCache?: VariableResolverCache,
  segment?: TextSegmentRange
): void {
  const rgba = {
    r: paint.color.r,
    g: paint.color.g,
    b: paint.color.b,
    a: paint.opacity ?? 1,
  };

  const hex = rgbaToHex(rgba);
  let tokenInfo: TokenInfo | null = null;
  if (boundVariable && resolverCache) {
    const cached = resolverCache.resolveCached(boundVariable);
    tokenInfo = cached === undefined ? null : cached;
  }
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
    mergeNodeRefIntoEntry(entry.nodes, nodeRef);
    entry.usageCount = countUniqueElements(entry.nodes);
  }
}

function addGradientColor(
  paint: GradientPaint,
  propertyType: PropertyType,
  propertyIndex: number,
  node: SceneNode,
  layerPath: string,
  colorMap: ColorMap,
  segment?: TextSegmentRange
): void {
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
    mergeNodeRefIntoEntry(entry.nodes, nodeRef);
    entry.usageCount = countUniqueElements(entry.nodes);
  }
}

function addGradientStopsAsSolids(
  paint: GradientPaint,
  field: 'fills' | 'strokes',
  propertyType: PropertyType,
  propertyIndex: number,
  node: SceneNode,
  layerPath: string,
  colorMap: ColorMap,
  resolverCache: VariableResolverCache,
  styles: NodePaintStyles,
  segment?: TextSegmentRange
): void {
  for (let stopIndex = 0; stopIndex < paint.gradientStops.length; stopIndex++) {
    const stop = paint.gradientStops[stopIndex];
    const syntheticPaint: SolidPaint = {
      type: 'SOLID',
      color: { r: stop.color.r, g: stop.color.g, b: stop.color.b },
      opacity: stop.color.a ?? 1,
      visible: true,
    };
    const boundVariable = resolveGradientStopBindingFromStyles(
      node,
      field,
      propertyIndex,
      stopIndex,
      paint,
      styles
    );
    addSolidColor(
      syntheticPaint,
      propertyType,
      propertyIndex,
      node,
      layerPath,
      colorMap,
      boundVariable,
      resolverCache,
      segment
    );
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
    visible: safeNodeVisible(node),
  };
}

