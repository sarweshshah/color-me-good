import { PropertyType } from '../shared/types';

export interface VariableBindingRef {
  nodeId: string;
  propertyType: PropertyType;
  propertyIndex: number;
}

function unbindSolidPaint(paint: SolidPaint): SolidPaint {
  return figma.variables.setBoundVariableForPaint(paint, 'color', null);
}

export function detachVariableFromNode(
  node: SceneNode,
  propertyType: PropertyType,
  propertyIndex: number
): boolean {
  try {
    if (propertyType === 'fill' || propertyType === 'text') {
      if (!('fills' in node) || !Array.isArray(node.fills)) return false;
      const fills = [...(node.fills as Paint[])];
      const paint = fills[propertyIndex];
      if (!paint || paint.type !== 'SOLID') return false;
      fills[propertyIndex] = unbindSolidPaint(paint);
      (node as GeometryMixin).fills = fills;
      return true;
    }

    if (propertyType === 'stroke') {
      if (!('strokes' in node) || !Array.isArray(node.strokes)) return false;
      const strokes = [...(node.strokes as Paint[])];
      const paint = strokes[propertyIndex];
      if (!paint || paint.type !== 'SOLID') return false;
      strokes[propertyIndex] = unbindSolidPaint(paint);
      (node as GeometryMixin).strokes = strokes;
      return true;
    }

    if (propertyType === 'effect') {
      if (!('effects' in node) || !Array.isArray(node.effects)) return false;
      const effects = [...(node.effects as Effect[])];
      const effect = effects[propertyIndex];
      if (!effect) return false;
      if (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW') return false;
      effects[propertyIndex] = figma.variables.setBoundVariableForEffect(
        effect,
        'color',
        null
      );
      (node as BlendMixin).effects = effects;
      return true;
    }

    return false;
  } catch (error) {
    console.warn(`Failed to detach variable from node ${node.id}:`, error);
    return false;
  }
}

export async function detachVariablesFromRefs(
  refs: VariableBindingRef[]
): Promise<{ detached: number; failed: number }> {
  const seen = new Set<string>();
  let detached = 0;
  let failed = 0;

  for (const ref of refs) {
    const key = `${ref.nodeId}:${ref.propertyType}:${ref.propertyIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const node = await figma.getNodeByIdAsync(ref.nodeId);
    if (!node || !('id' in node)) {
      failed++;
      continue;
    }

    if (detachVariableFromNode(node as SceneNode, ref.propertyType, ref.propertyIndex)) {
      detached++;
    } else {
      failed++;
    }
  }

  return { detached, failed };
}
