import { useMemo, useState, memo } from 'preact/compat';
import { SerializedColorEntry, PropertyType } from '../../shared/types';
import { SHAPE_NODE_TYPES } from '../../shared/constants';
import { matchesNodeFilters } from '../../shared/filters';
import { Swatch } from './Swatch';
import { formatResolvedColor } from '../utils/format';
import { copyColorToClipboard } from '../utils/clipboard';
import type { ColorDisplayFormat } from '../../shared/messages';
import {
  SwatchBook,
  Circle,
  LibraryBig,
  Crosshair,
  Type,
  Square,
  Minus,
  Layers,
  Layout,
  Frame,
  Component,
  PenTool,
  Box,
} from 'lucide-preact';

const NODE_TYPE_ICONS: Record<string, typeof Box> = {
  TEXT: Type,
  RECTANGLE: Square,
  ELLIPSE: Circle,
  LINE: Minus,
  FRAME: Frame,
  SECTION: Layout,
  GROUP: Layers,
  COMPONENT: Component,
  INSTANCE: Box,
  VECTOR: PenTool,
  STAR: Square,
  POLYGON: Square,
  BOOLEAN_OPERATION: PenTool,
};

const INITIAL_VISIBLE_ELEMENTS = 20;
const VISIBLE_ELEMENTS_STEP = 20;

function NodeTypeIcon({ nodeType }: { nodeType?: string }) {
  const Icon = (nodeType && NODE_TYPE_ICONS[nodeType]) || Box;
  return (
    <span className="w-6 h-6 flex items-center justify-center shrink-0 text-figma-text-secondary">
      <Icon size={16} />
    </span>
  );
}

interface ColorRowProps {
  color: SerializedColorEntry;
  isSelected: boolean;
  propertyFilters: Set<PropertyType>;
  nodeTypeFilters: Set<string>;
  hiddenOnlyFilter: boolean;
  colorDisplayFormat: ColorDisplayFormat;
  onSelectAll: (color: SerializedColorEntry, event: MouseEvent) => void;
  onRowClick: (color: SerializedColorEntry, event: MouseEvent) => void;
  onElementClick: (nodeId: string, event: MouseEvent) => void;
  onCopySuccess?: () => void;
}

export const ColorRow = memo(function ColorRow({
  color,
  isSelected,
  propertyFilters,
  nodeTypeFilters,
  hiddenOnlyFilter,
  colorDisplayFormat,
  onSelectAll,
  onRowClick,
  onElementClick,
  onCopySuccess,
}: ColorRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ELEMENTS);

  const displayName = color.tokenName || formatResolvedColor(color, colorDisplayFormat);

  const { filteredNodes, displayCount, hasActiveFilters } = useMemo(() => {
    const filtered = color.nodes.filter((n) =>
      matchesNodeFilters(n, propertyFilters, nodeTypeFilters, hiddenOnlyFilter)
    );
    const hasFilters =
      propertyFilters.size > 0 || nodeTypeFilters.size > 0 || hiddenOnlyFilter;
    return {
      filteredNodes: filtered,
      displayCount: hasFilters ? filtered.length : color.usageCount,
      hasActiveFilters: hasFilters,
    };
  }, [color.nodes, color.usageCount, propertyFilters, nodeTypeFilters, hiddenOnlyFilter]);

  const nodesByType = useMemo(
    () =>
      filteredNodes.reduce(
        (acc, n) => {
          const t = n.nodeType || 'Unknown';
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    [filteredNodes]
  );
  const tooltipBreakdown = Object.entries(nodesByType)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => `${type.charAt(0)}${type.slice(1).toLowerCase()}: ${count}`)
    .join('\n');

  const selectAllTooltip =
    hasActiveFilters && filteredNodes.length === 0
      ? 'No matching elements'
      : `${
          hasActiveFilters && filteredNodes.length > 0
            ? `Select all ${filteredNodes.length} matching element${filteredNodes.length === 1 ? '' : 's'}`
            : 'Select all elements with this color'
        }. ⌘/Ctrl+Click: add to canvas selection`;

  const badge = color.isTokenBound ? (
    <span
      className="text-figma-text-secondary hover:text-figma-blue text-[10px] flex items-center transition-colors"
      data-tooltip="Token-bound"
    >
      <SwatchBook size={12} strokeWidth={2.25} />
    </span>
  ) : null;

  const libraryIcon = color.isLibraryVariable && (
    <span
      className="text-figma-text-secondary hover:text-figma-blue text-[10px] flex items-center transition-colors"
      data-tooltip={color.libraryName ?? 'Imported Library'}
    >
      <LibraryBig size={12} strokeWidth={1.75} />
    </span>
  );

  const handleCopy = async (e: Event) => {
    e.stopPropagation();
    const success = await copyColorToClipboard(color, colorDisplayFormat);
    if (success) {
      onCopySuccess?.();
    }
  };

  return (
    <div
      className={`color-row border-b border-figma-border ${isSelected ? 'color-row-selected bg-figma-blue/10' : ''}`}
    >
      <div
        className="px-3 py-1.5 hover:bg-figma-surface/50 cursor-pointer flex items-center gap-3"
        onClick={(e) => {
          onRowClick(color, e as unknown as MouseEvent);
          if (isExpanded) {
            setIsExpanded(false);
          } else {
            setVisibleCount(INITIAL_VISIBLE_ELEMENTS);
            setIsExpanded(true);
          }
        }}
      >
        <div
          className="relative"
          onClick={handleCopy}
          data-tooltip="Click to copy"
          data-tooltip-position="below"
        >
          <Swatch color={color} size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-figma-text text-[11px] font-medium truncate">
              {displayName}
            </span>
            {libraryIcon}
            {badge}
          </div>
          {color.tokenName && (color.hex || color.rgba) && (
            <div className="text-figma-text-secondary text-[10px] mt-0 leading-tight">
              {formatResolvedColor(color, colorDisplayFormat)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-figma-text-secondary text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded bg-figma-bg/60 transition-colors hover:bg-figma-bg hover:text-figma-blue cursor-default"
            data-tooltip={
              tooltipBreakdown ||
              (hasActiveFilters ? 'No matching elements' : 'No elements')
            }
            data-tooltip-align="end"
          >
            <Layers size={10} className="shrink-0" />
            {displayCount}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectAll(color, e as unknown as MouseEvent);
            }}
            className="p-0.5 text-figma-text-secondary hover:text-figma-blue transition-colors rounded hover:bg-figma-bg"
            data-tooltip={selectAllTooltip}
            data-tooltip-align="end"
          >
            <Crosshair size={12} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <ExpandedNodeList
          color={color}
          nodeTypeFilters={nodeTypeFilters}
          hiddenOnlyFilter={hiddenOnlyFilter}
          visibleCount={visibleCount}
          onShowMore={(total) =>
            setVisibleCount((prev) => Math.min(total, prev + VISIBLE_ELEMENTS_STEP))
          }
          onElementClick={onElementClick}
        />
      )}
    </div>
  );
});

interface ExpandedNodeListProps {
  color: SerializedColorEntry;
  nodeTypeFilters: Set<string>;
  hiddenOnlyFilter: boolean;
  visibleCount: number;
  onShowMore: (totalCount: number) => void;
  onElementClick: (nodeId: string, event: MouseEvent) => void;
}

function ExpandedNodeList({
  color,
  nodeTypeFilters,
  hiddenOnlyFilter,
  visibleCount,
  onShowMore,
  onElementClick,
}: ExpandedNodeListProps) {
  const nodesToShow = useMemo(
    () =>
      color.nodes.filter((n) => {
        if (hiddenOnlyFilter && n.visible !== false) return false;
        if (nodeTypeFilters.size === 0) return true;
        const type = n.nodeType;
        if (!type) return false;
        if (nodeTypeFilters.has(type)) return true;
        if (nodeTypeFilters.has('Shape') && SHAPE_NODE_TYPES.has(type)) return true;
        return false;
      }),
    [color.nodes, nodeTypeFilters, hiddenOnlyFilter]
  );

  if (nodesToShow.length === 0) return null;

  const visibleNodes = nodesToShow.slice(0, visibleCount);
  const remainingCount = Math.max(0, nodesToShow.length - visibleNodes.length);

  return (
    <div className="bg-figma-surface border-t border-figma-border pt-1 pb-1 w-full">
      {visibleNodes.map((nodeRef, idx) => (
        <div
          key={`${nodeRef.nodeId}-${nodeRef.propertyType}-${idx}`}
          className="w-full py-2 pl-2 pr-4 hover:bg-figma-bg-hover cursor-pointer flex items-center justify-between gap-3"
          onClick={(e) => onElementClick(nodeRef.nodeId, e as unknown as MouseEvent)}
        >
          <div className="flex-1 min-w-0 flex items-center gap-1">
            <NodeTypeIcon nodeType={nodeRef.nodeType} />
            <div className="min-w-0">
              <div className="text-figma-text text-[11px] font-medium truncate">
                {nodeRef.nodeName}
              </div>
              <div className="text-figma-text-secondary text-[10px] truncate">
                {nodeRef.layerPath}
              </div>
            </div>
          </div>
          <span className="text-figma-text-secondary text-[10px] shrink-0">
            {nodeRef.propertyType}
          </span>
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="py-2 px-4 text-center">
          <button
            type="button"
            className="text-figma-blue text-xs hover:underline"
            onClick={() => onShowMore(nodesToShow.length)}
          >
            Show {Math.min(VISIBLE_ELEMENTS_STEP, remainingCount)} more
            {remainingCount > VISIBLE_ELEMENTS_STEP
              ? ` (${remainingCount - Math.min(VISIBLE_ELEMENTS_STEP, remainingCount)} left)`
              : ''}
          </button>
        </div>
      )}
    </div>
  );
}
