import {
  ColorEntry,
  NodeRef,
  ScanContext,
  PropertyType,
  GradientData,
  GradientType,
} from '../shared/types';
import { rgbaToHex, hashGradient, buildLayerPath, isValidScopeNode } from './utils';
import { resolveVariableBinding, resolveStyleBinding } from './variable-resolver';

export interface ScanOptions {
  onProgress?: (scanned: number, total: number) => void;
  onError?: (error: Error) => void;
}

interface ColorMap {
  [dedupKey: string]: ColorEntry;
}

export async function scanCurrentPage(
  options: ScanOptions = {}
): Promise<{ colors: ColorEntry[]; context: ScanContext }> {
  const colorMap: ColorMap = {};

  const context = resolveScanContext();

  const rootNodes =
    context.mode === 'selection' && context.scopeNodeId
      ? [await figma.getNodeByIdAsync(context.scopeNodeId) as SceneNode]
      : (figma.currentPage.children as SceneNode[]);

  let totalNodes = 0;
  let scannedNodes = 0;

  function countNodes(node: SceneNode): number {
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
    yield node;
    scannedNodes++;

    if (scannedNodes % 500 === 0 && options.onProgress) {
      options.onProgress(scannedNodes, totalNodes);
      await new Promise((resolve) => setTimeout(resolve, 0));
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

      for await (const node of traverseNodes(root)) {
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

  if (selection.length > 1) {
    figma.notify('Tip: Select a single frame, section, or group to scope your scan', {
      timeout: 3000,
    });
  }

  if (
    selection.length === 1 &&
    isValidScopeNode(selection[0])
  ) {
    const node = selection[0];
    return {
      mode: 'selection',
      scopeNodeId: node.id,
      scopeNodeName: node.name,
      scopeNodeType: node.type as 'FRAME' | 'SECTION' | 'GROUP',
      totalNodesScanned: 0,
      timestamp: '',
    };
  }

  if (
    selection.length === 1 &&
    !isValidScopeNode(selection[0])
  ) {
    figma.notify('Tip: Select a frame, section, or group to scope your scan', {
      timeout: 3000,
    });
  }

  return {
    mode: 'page',
    scopeNodeId: null,
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

    if (node.type === 'TEXT') {
      await extractTextColors(node, layerPath, colorMap);
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
  const dedupKey = hex;

  let tokenInfo = await resolveVariableBinding(boundVariable);
  
  if (!tokenInfo && 'fillStyleId' in node && propertyType === 'fill') {
    tokenInfo = await resolveStyleBinding(node.fillStyleId as string);
  } else if (!tokenInfo && 'strokeStyleId' in node && propertyType === 'stroke') {
    tokenInfo = await resolveStyleBinding(node.strokeStyleId as string);
  }

  const nodeRef: NodeRef = {
    nodeId: node.id,
    nodeName: node.name,
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
      isLibraryVariable: tokenInfo?.isLibraryVariable ?? false,
      styleName: tokenInfo?.styleName ?? null,
      styleId: tokenInfo?.styleId ?? null,
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
    
    if (tokenInfo && !entry.isTokenBound) {
      entry.tokenName = tokenInfo.tokenName;
      entry.tokenCollection = tokenInfo.tokenCollection;
      entry.isLibraryVariable = tokenInfo.isLibraryVariable;
      entry.isTokenBound = true;
    }
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

async function extractTextColors(
  textNode: TextNode,
  layerPath: string,
  colorMap: ColorMap
): Promise<void> {
  try {
    const segments = textNode.getStyledTextSegments(['fills']);

    for (const segment of segments) {
      if (!segment.fills || !Array.isArray(segment.fills)) continue;

      for (let i = 0; i < segment.fills.length; i++) {
        const paint = segment.fills[i];
        if (paint.type !== 'SOLID' || paint.visible === false) continue;

        const rgba = {
          r: paint.color.r,
          g: paint.color.g,
          b: paint.color.b,
          a: paint.opacity ?? 1,
        };

        const hex = rgbaToHex(rgba);
        const dedupKey = hex;

        const nodeRef: NodeRef = {
          nodeId: textNode.id,
          nodeName: textNode.name,
          layerPath,
          propertyType: 'text',
          propertyIndex: segment.start,
        };

        if (!colorMap[dedupKey]) {
          colorMap[dedupKey] = {
            type: 'solid',
            hex,
            rgba,
            gradient: null,
            dedupKey,
            tokenName: null,
            tokenCollection: null,
            isLibraryVariable: false,
            styleName: null,
            styleId: null,
            propertyTypes: new Set(['text']),
            nodes: [nodeRef],
            usageCount: 1,
            isTokenBound: false,
          };
        } else {
          const entry = colorMap[dedupKey];
          entry.propertyTypes.add('text');
          entry.nodes.push(nodeRef);
          entry.usageCount++;
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to extract text colors from node ${textNode.id}:`, error);
  }
}
