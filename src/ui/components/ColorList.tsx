import { useRef, useState, useCallback, useEffect } from 'preact/hooks';
import type { VNode } from 'preact';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SerializedColorEntry, PropertyType } from '../../shared/types';
import type { ColorDisplayFormat } from '../../shared/messages';
import {
  ColorRow,
  INITIAL_VISIBLE_ELEMENTS,
  VISIBLE_ELEMENTS_STEP,
} from './ColorRow';
import { useGsapContext } from '../hooks/useGsapContext';
import { animateFromInScope, DELAY, DURATION, EASE } from '../utils/motion';

/** Above this row count, switch from a plain list to a virtualized one. */
const VIRTUALIZE_THRESHOLD = 150;
/** Approximate collapsed row height (py-1.5 + 20px swatch) used to seed the virtualizer. */
const ESTIMATED_ROW_HEIGHT = 33;

interface ColorListProps {
  /** Changes when the underlying scan results change (not filters/sort). */
  entranceKey: string;
  colors: SerializedColorEntry[];
  selectedIds: Set<string>;
  propertyFilters: Set<PropertyType>;
  nodeTypeFilters: Set<string>;
  hiddenOnlyFilter: boolean;
  colorDisplayFormat: ColorDisplayFormat;
  onSelectAll: (color: SerializedColorEntry, event: MouseEvent) => void;
  onDetachVariable: (color: SerializedColorEntry, event: MouseEvent) => void;
  onRowClick: (color: SerializedColorEntry, event: MouseEvent) => void;
  onElementClick: (nodeId: string, event: MouseEvent) => void;
  onElementDoubleClick: (nodeId: string, event: MouseEvent) => void;
  onCopySuccess?: () => void;
}

type RenderRow = (color: SerializedColorEntry) => VNode;

export function ColorList({
  entranceKey,
  colors,
  selectedIds,
  propertyFilters,
  nodeTypeFilters,
  hiddenOnlyFilter,
  colorDisplayFormat,
  onSelectAll,
  onDetachVariable,
  onRowClick,
  onElementClick,
  onElementDoubleClick,
  onCopySuccess,
}: ColorListProps) {
  // Expansion state is lifted out of ColorRow so it survives row recycling
  // when the virtualized list unmounts off-screen rows.
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [visibleCounts, setVisibleCounts] = useState<Map<string, number>>(
    new Map()
  );

  useEffect(() => {
    setExpandedKeys(new Set());
    setVisibleCounts(new Map());
  }, [entranceKey]);

  const onToggleExpand = useCallback((dedupKey: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dedupKey)) next.delete(dedupKey);
      else next.add(dedupKey);
      return next;
    });
    // Reset the progressive reveal each time the row is (re)expanded.
    setVisibleCounts((prev) => {
      const next = new Map(prev);
      next.set(dedupKey, INITIAL_VISIBLE_ELEMENTS);
      return next;
    });
  }, []);

  const onShowMore = useCallback((dedupKey: string, total: number) => {
    setVisibleCounts((prev) => {
      const next = new Map(prev);
      const current = next.get(dedupKey) ?? INITIAL_VISIBLE_ELEMENTS;
      next.set(dedupKey, Math.min(total, current + VISIBLE_ELEMENTS_STEP));
      return next;
    });
  }, []);

  const renderRow: RenderRow = (color) => (
    <ColorRow
      key={color.dedupKey}
      color={color}
      isSelected={selectedIds.has(color.dedupKey)}
      isExpanded={expandedKeys.has(color.dedupKey)}
      visibleCount={visibleCounts.get(color.dedupKey) ?? INITIAL_VISIBLE_ELEMENTS}
      propertyFilters={propertyFilters}
      nodeTypeFilters={nodeTypeFilters}
      hiddenOnlyFilter={hiddenOnlyFilter}
      colorDisplayFormat={colorDisplayFormat}
      onSelectAll={onSelectAll}
      onDetachVariable={onDetachVariable}
      onRowClick={onRowClick}
      onToggleExpand={onToggleExpand}
      onShowMore={onShowMore}
      onElementClick={onElementClick}
      onElementDoubleClick={onElementDoubleClick}
      onCopySuccess={onCopySuccess}
    />
  );

  if (colors.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-figma-text-secondary text-sm">
          No colors match your filters
        </div>
      </div>
    );
  }

  return colors.length > VIRTUALIZE_THRESHOLD ? (
    <VirtualColorList colors={colors} renderRow={renderRow} />
  ) : (
    <PlainColorList
      entranceKey={entranceKey}
      colors={colors}
      renderRow={renderRow}
    />
  );
}

interface PlainColorListProps {
  entranceKey: string;
  colors: SerializedColorEntry[];
  renderRow: RenderRow;
}

function PlainColorList({ entranceKey, colors, renderRow }: PlainColorListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useGsapContext(
    (scope) => {
      if (!entranceKey || colors.length === 0) return;

      animateFromInScope(scope, '.color-row', {
        autoAlpha: 0,
        y: 6,
        duration: DURATION.normal,
        delay: DELAY.afterHeader,
        stagger: { amount: 0.35, from: 'start' },
        ease: EASE.out,
        overwrite: 'auto',
      });
    },
    [entranceKey],
    listRef
  );

  return (
    <div ref={listRef} className="flex-1 min-h-0 overflow-auto overscroll-contain">
      {colors.map(renderRow)}
    </div>
  );
}

interface VirtualColorListProps {
  colors: SerializedColorEntry[];
  renderRow: RenderRow;
}

function VirtualColorList({ colors, renderRow }: VirtualColorListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: colors.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => colors[index].dedupKey,
  });

  return (
    <div ref={listRef} className="flex-1 min-h-0 overflow-auto overscroll-contain">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderRow(colors[virtualItem.index])}
          </div>
        ))}
      </div>
    </div>
  );
}
