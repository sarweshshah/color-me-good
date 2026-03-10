import { NodeRef, PropertyType } from './types';
import { SHAPE_NODE_TYPES } from './constants';

export function isNodeHidden(node: NodeRef): boolean {
  return node.visible === false;
}

export function matchesNodeFilters(
  node: NodeRef,
  propertyFilters: Set<PropertyType>,
  nodeTypeFilters: Set<string>,
  hiddenOnlyFilter?: boolean
): boolean {
  if (hiddenOnlyFilter && !isNodeHidden(node)) return false;
  if (propertyFilters.size > 0 && !propertyFilters.has(node.propertyType)) return false;
  if (nodeTypeFilters.size > 0) {
    const type = node.nodeType;
    if (!type) return false;
    if (nodeTypeFilters.has(type)) return true;
    if (nodeTypeFilters.has('Shape') && SHAPE_NODE_TYPES.has(type)) return true;
    return false;
  }
  return true;
}
