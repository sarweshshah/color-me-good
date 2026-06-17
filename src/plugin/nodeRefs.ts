import { NodeRef } from '../shared/types';

interface TextCharacterRange {
  characterStart: number;
  characterEnd: number;
}

export function countUniqueElements(nodes: NodeRef[]): number {
  return new Set(nodes.map((node) => node.nodeId)).size;
}

function nodeRefElementKey(
  ref: Pick<NodeRef, 'nodeId' | 'propertyType' | 'propertyIndex'>
): string {
  return `${ref.nodeId}:${ref.propertyType}:${ref.propertyIndex}`;
}

function rangesEqual(a: TextCharacterRange, b: TextCharacterRange): boolean {
  return a.characterStart === b.characterStart && a.characterEnd === b.characterEnd;
}

function getNodeRefCharacterRanges(ref: NodeRef): TextCharacterRange[] {
  if (ref.characterRanges?.length) return ref.characterRanges;
  if (ref.characterStart !== undefined && ref.characterEnd !== undefined) {
    return [{ characterStart: ref.characterStart, characterEnd: ref.characterEnd }];
  }
  return [];
}

function cloneNodeRef(ref: NodeRef): NodeRef {
  return {
    ...ref,
    characterRanges: ref.characterRanges?.map((range) => ({ ...range })),
  };
}

function appendCharacterRange(ref: NodeRef, range: TextCharacterRange): boolean {
  const ranges = getNodeRefCharacterRanges(ref);
  if (ranges.some((existing) => rangesEqual(existing, range))) return false;

  if (ranges.length === 0) {
    ref.characterStart = range.characterStart;
    ref.characterEnd = range.characterEnd;
    return true;
  }

  if (ranges.length === 1 && !ref.characterRanges) {
    ref.characterRanges = [
      { characterStart: ref.characterStart!, characterEnd: ref.characterEnd! },
      range,
    ];
    delete ref.characterStart;
    delete ref.characterEnd;
    return true;
  }

  ref.characterRanges = [...ranges, range];
  return true;
}

/** Adds `incoming` to `nodes`, merging text ranges when the same element already exists. */
export function mergeNodeRefIntoEntry(nodes: NodeRef[], incoming: NodeRef): void {
  const key = nodeRefElementKey(incoming);
  const existing = nodes.find((node) => nodeRefElementKey(node) === key);
  if (!existing) {
    nodes.push(incoming);
    return;
  }

  const incomingRanges = getNodeRefCharacterRanges(incoming);
  for (const range of incomingRanges) {
    appendCharacterRange(existing, range);
  }
}

export function mergeNodeRefLists(existing: NodeRef[], incoming: NodeRef[]): NodeRef[] {
  const merged = existing.map(cloneNodeRef);
  for (const ref of incoming) {
    mergeNodeRefIntoEntry(merged, cloneNodeRef(ref));
  }
  return merged;
}
