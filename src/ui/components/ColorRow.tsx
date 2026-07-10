import { useMemo, useRef, useEffect, memo } from 'preact/compat';
import { gsap } from 'gsap';
import { SerializedColorEntry, PropertyType } from '../../shared/types';
import { SHAPE_NODE_TYPES } from '../../shared/constants';
import { formatNodeRefRangeHint, countUniqueElements, groupNodeRefsByElement, formatPropertyTypes } from '../../shared/nodeRefs';
import { matchesNodeFilters } from '../../shared/filters';
import { Swatch } from './Swatch';
import { formatResolvedColor } from '../utils/format';
import { copyColorToClipboard } from '../utils/clipboard';
import { DURATION, EASE, pulseScale, tweenVars } from '../utils/motion';
import type { ColorDisplayFormat } from '../../shared/messages';
import {
  SwatchBook,
  Circle,
  LibraryBig,
  Crosshair,
  Unlink,
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

export const INITIAL_VISIBLE_ELEMENTS = 20;
export const VISIBLE_ELEMENTS_STEP = 20;

function NodeTypeIcon({ nodeType }: { nodeType?: string }) {
  const Icon = (nodeType && NODE_TYPE_ICONS[nodeType]) || Box;
  return (
    <span className="w-5 h-5 flex items-center justify-center shrink-0 text-figma-text-secondary">
      <Icon size={14} />
    </span>
  );
}

interface ColorRowProps {
  color: SerializedColorEntry;
  isSelected: boolean;
  isExpanded: boolean;
  visibleCount: number;
  propertyFilters: Set<PropertyType>;
  nodeTypeFilters: Set<string>;
  hiddenOnlyFilter: boolean;
  colorDisplayFormat: ColorDisplayFormat;
  onSelectAll: (color: SerializedColorEntry, event: MouseEvent) => void;
  onDetachVariable: (color: SerializedColorEntry, event: MouseEvent) => void;
  onRowClick: (color: SerializedColorEntry, event: MouseEvent) => void;
  onToggleExpand: (dedupKey: string) => void;
  onShowMore: (dedupKey: string, total: number) => void;
  onElementClick: (nodeId: string, event: MouseEvent) => void;
  onElementDoubleClick: (nodeId: string, event: MouseEvent) => void;
  onCopySuccess?: () => void;
}

export const ColorRow = memo(function ColorRow({
  color,
  isExpanded,
  visibleCount,
  propertyFilters,
  nodeTypeFilters,
  hiddenOnlyFilter,
  colorDisplayFormat,
  onSelectAll,
  onDetachVariable,
  onRowClick,
  onToggleExpand,
  onShowMore,
  onElementClick,
  onElementDoubleClick,
  onCopySuccess,
}: ColorRowProps) {
  const swatchRef = useRef<HTMLDivElement>(null);

  const displayName = color.tokenName || formatResolvedColor(color, colorDisplayFormat);

  const { filteredElements, displayCount, hasActiveFilters } = useMemo(() => {
    const filtered = color.nodes.filter((n) =>
      matchesNodeFilters(n, propertyFilters, nodeTypeFilters, hiddenOnlyFilter)
    );
    const elements = groupNodeRefsByElement(filtered);
    const hasFilters =
      propertyFilters.size > 0 || nodeTypeFilters.size > 0 || hiddenOnlyFilter;
    return {
      filteredElements: elements,
      displayCount: countUniqueElements(filtered),
      hasActiveFilters: hasFilters,
    };
  }, [color.nodes, propertyFilters, nodeTypeFilters, hiddenOnlyFilter]);

  const nodesByType = useMemo(
    () =>
      filteredElements.reduce(
        (acc, { nodeRef }) => {
          const t = nodeRef.nodeType || 'Unknown';
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    [filteredElements]
  );
  const tooltipBreakdown = Object.entries(nodesByType)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => `${type.charAt(0)}${type.slice(1).toLowerCase()}: ${count}`)
    .join('\n');

  const selectAllTooltip =
    hasActiveFilters && filteredElements.length === 0
      ? 'No matching elements'
      : `${
          hasActiveFilters && filteredElements.length > 0
            ? `Select all ${filteredElements.length} matching element${filteredElements.length === 1 ? '' : 's'}`
            : 'Select all elements with this color'
        }. ⌘/Ctrl+Click: add to canvas selection`;

  const detachTooltip =
    hasActiveFilters && filteredElements.length === 0
      ? 'No matching elements'
      : color.tokenName
        ? `Detach "${color.tokenName}" from all elements with this color`
        : 'Detach variable from all elements with this color';

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
    pulseScale(swatchRef.current);
    const success = await copyColorToClipboard(color, colorDisplayFormat);
    if (success) {
      onCopySuccess?.();
    }
  };

  return (
    <div
      className={`color-row ${isExpanded ? 'color-row-selected bg-figma-blue/10' : ''}`}
    >
      <div
        className="px-3 py-1.5 hover:bg-figma-surface/50 cursor-pointer flex items-center gap-3"
        onClick={(e) => {
          onRowClick(color, e as unknown as MouseEvent);
          onToggleExpand(color.dedupKey);
        }}
      >
        <div
          ref={swatchRef}
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
          {color.isTokenBound && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDetachVariable(color, e as unknown as MouseEvent);
              }}
              className="p-0.5 text-figma-text-secondary hover:text-figma-blue transition-colors rounded hover:bg-figma-bg"
              data-tooltip={detachTooltip}
              data-tooltip-align="end"
              aria-label="Detach variable"
            >
              <Unlink size={12} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectAll(color, e as unknown as MouseEvent);
            }}
            className="p-0.5 text-figma-text-secondary hover:text-figma-blue transition-colors rounded hover:bg-figma-bg"
            data-tooltip={selectAllTooltip}
            data-tooltip-align="end"
            aria-label="Locate color"
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
          onShowMore={(total) => onShowMore(color.dedupKey, total)}
          onElementClick={onElementClick}
          onElementDoubleClick={onElementDoubleClick}
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
  onElementDoubleClick: (nodeId: string, event: MouseEvent) => void;
}

function ExpandedNodeList({
  color,
  nodeTypeFilters,
  hiddenOnlyFilter,
  visibleCount,
  onShowMore,
  onElementClick,
  onElementDoubleClick,
}: ExpandedNodeListProps) {
  const expandedRef = useRef<HTMLDivElement>(null);
  const animatedNodeCountRef = useRef(0);
  const prevNodesKeyRef = useRef('');

  const nodesToShow = useMemo(() => {
    const filtered = color.nodes.filter((n) => {
      if (hiddenOnlyFilter && n.visible !== false) return false;
      if (nodeTypeFilters.size === 0) return true;
      const type = n.nodeType;
      if (!type) return false;
      if (nodeTypeFilters.has(type)) return true;
      if (nodeTypeFilters.has('Shape') && SHAPE_NODE_TYPES.has(type)) return true;
      return false;
    });
    return groupNodeRefsByElement(filtered);
  }, [color.nodes, nodeTypeFilters, hiddenOnlyFilter]);

  const nodesKey = useMemo(
    () => nodesToShow.map((n) => n.nodeRef.nodeId).join('|'),
    [nodesToShow]
  );

  useEffect(() => {
    const el = expandedRef.current;
    if (!el) return;
    const tween = gsap.from(el, tweenVars({
      autoAlpha: 0,
      duration: DURATION.faster,
      ease: EASE.out,
    }));
    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    const el = expandedRef.current;
    if (!el) return;

    if (prevNodesKeyRef.current !== nodesKey) {
      animatedNodeCountRef.current = 0;
      prevNodesKeyRef.current = nodesKey;
    }

    const nodeElements = el.querySelectorAll('.color-row-element[data-node-row]');
    const startIdx = animatedNodeCountRef.current;
    const newElements = Array.from(nodeElements).slice(startIdx);
    if (newElements.length === 0) return;

    const tween = gsap.from(newElements, tweenVars({
      autoAlpha: 0,
      duration: DURATION.faster,
      stagger: 0.01,
      ease: EASE.out,
    }));
    animatedNodeCountRef.current = nodeElements.length;

    return () => {
      tween.kill();
    };
  }, [visibleCount, nodesKey]);

  if (nodesToShow.length === 0) return null;

  const visibleNodes = nodesToShow.slice(0, visibleCount);
  const remainingCount = Math.max(0, nodesToShow.length - visibleNodes.length);

  return (
    <div
      ref={expandedRef}
      className="color-row-expanded w-full"
      style={{ visibility: 'hidden' }}
    >
      {visibleNodes.map(({ nodeRef, propertyTypes }, idx) => {
        const rangeHint = formatNodeRefRangeHint(nodeRef);
        return (
        <div
          key={`${nodeRef.nodeId}-${idx}`}
          data-node-row
          className="color-row-element w-full py-2 pr-4 hover:bg-figma-bg-hover cursor-pointer flex items-center gap-3"
          onClick={(e) => onElementClick(nodeRef.nodeId, e as unknown as MouseEvent)}
          onDblClick={(e) =>
            onElementDoubleClick(nodeRef.nodeId, e as unknown as MouseEvent)
          }
        >
          <NodeTypeIcon nodeType={nodeRef.nodeType} />
          <div className="flex-1 min-w-0">
            <div className="text-figma-text text-[11px] font-medium truncate">
              {nodeRef.nodeName}
            </div>
            <div className="text-figma-text-secondary text-[10px] truncate">
              {rangeHint ? `${nodeRef.layerPath} · ${rangeHint}` : nodeRef.layerPath}
            </div>
          </div>
          <span className="text-figma-text-secondary text-[10px] shrink-0">
            {formatPropertyTypes(propertyTypes)}
          </span>
        </div>
        );
      })}
      {remainingCount > 0 && (
        <div className="color-row-element py-2 pr-4">
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
