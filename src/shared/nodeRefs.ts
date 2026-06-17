import { NodeRef, PropertyType } from './types';

export function countUniqueElements(nodes: NodeRef[]): number {
  return new Set(nodes.map((node) => node.nodeId)).size;
}

export function getNodeRefCharacterRanges(
  ref: NodeRef
): { characterStart: number; characterEnd: number }[] {
  if (ref.characterRanges?.length) return ref.characterRanges;
  if (ref.characterStart !== undefined && ref.characterEnd !== undefined) {
    return [{ characterStart: ref.characterStart, characterEnd: ref.characterEnd }];
  }
  return [];
}

export interface GroupedNodeRef {
  nodeRef: NodeRef;
  propertyTypes: PropertyType[];
}

/** One row per Figma layer, combining fill/stroke/text refs on the same node. */
export function groupNodeRefsByElement(nodes: NodeRef[]): GroupedNodeRef[] {
  const map = new Map<string, GroupedNodeRef>();

  for (const ref of nodes) {
    const existing = map.get(ref.nodeId);
    if (!existing) {
      map.set(ref.nodeId, { nodeRef: ref, propertyTypes: [ref.propertyType] });
      continue;
    }

    if (!existing.propertyTypes.includes(ref.propertyType)) {
      existing.propertyTypes.push(ref.propertyType);
    }

    if (
      getNodeRefCharacterRanges(ref).length >
      getNodeRefCharacterRanges(existing.nodeRef).length
    ) {
      existing.nodeRef = ref;
    }
  }

  return Array.from(map.values());
}

export function flattenNodeRefBindings(
  ref: NodeRef
): Array<
  Pick<NodeRef, 'nodeId' | 'propertyType' | 'propertyIndex' | 'characterStart' | 'characterEnd'>
> {
  const base = {
    nodeId: ref.nodeId,
    propertyType: ref.propertyType,
    propertyIndex: ref.propertyIndex,
  };
  const ranges = getNodeRefCharacterRanges(ref);
  if (ranges.length === 0) return [base];
  return ranges.map((range) => ({ ...base, ...range }));
}

export function formatNodeRefRangeHint(ref: NodeRef): string | null {
  if (ref.nodeType !== 'TEXT') return null;
  const ranges = getNodeRefCharacterRanges(ref);
  if (ranges.length < 2) return null;
  return `${ranges.length} styled ranges`;
}

export function formatPropertyTypes(types: PropertyType[]): string {
  return [...types].sort().join(', ');
}
