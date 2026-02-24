import { useState } from 'preact/hooks';
import { SerializedColorEntry } from '../../shared/types';
import { Swatch } from './Swatch';
import { formatHex } from '../utils/format';
import { copyColorToClipboard } from '../utils/clipboard';
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
const SHAPE_NODE_TYPES = new Set([
  'RECTANGLE',
  'ELLIPSE',
  'LINE',
  'STAR',
  'POLYGON',
  'BOOLEAN_OPERATION',
]);

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
  nodeTypeFilters: Set<string>;
  onSelectAll: (color: SerializedColorEntry, event: MouseEvent) => void;
  onRowClick: (color: SerializedColorEntry, event: MouseEvent) => void;
  onElementClick: (nodeId: string) => void;
  onCopySuccess?: () => void;
}

export function ColorRow({
  color,
  isSelected,
  nodeTypeFilters,
  onSelectAll,
  onRowClick,
  onElementClick,
  onCopySuccess,
}: ColorRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ELEMENTS);

  const displayName = color.tokenName || (color.hex ? formatHex(color.hex) : 'Gradient');

  const nodesByType = color.nodes
    .filter((n) => n.propertyType !== 'text')
    .reduce(
      (acc, n) => {
        const t = n.nodeType || 'Unknown';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  const tooltipBreakdown = Object.entries(nodesByType)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => `${type.charAt(0)}${type.slice(1).toLowerCase()}: ${count}`)
    .join('\n');

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
    const success = await copyColorToClipboard(color);
    if (success) {
      onCopySuccess?.();
    }
  };

  return (
    <div
      className={`border-b border-figma-border ${isSelected ? 'bg-figma-blue/10' : ''}`}
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
          {color.tokenName && color.hex && (
            <div className="text-figma-text-secondary text-[10px] mt-0 leading-tight">
              {formatHex(color.hex)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-figma-text-secondary text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded bg-figma-bg/60 transition-colors hover:bg-figma-bg hover:text-figma-blue cursor-default"
            data-tooltip={tooltipBreakdown || 'No elements'}
            data-tooltip-align="end"
          >
            <Layers size={10} className="shrink-0" />
            {color.usageCount}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectAll(color, e as unknown as MouseEvent);
            }}
            className="p-0.5 text-figma-text-secondary hover:text-figma-blue transition-colors rounded hover:bg-figma-bg"
            data-tooltip="Select all elements with this color"
            data-tooltip-align="end"
          >
            <Crosshair size={12} />
          </button>
        </div>
      </div>

      {isExpanded &&
        (() => {
          const nodesToShow = color.nodes.filter((n) => {
            if (n.propertyType === 'text') return false;
            if (nodeTypeFilters.size === 0) return true;

            const type = n.nodeType;
            if (!type) return false;
            if (nodeTypeFilters.has(type)) return true;
            if (nodeTypeFilters.has('Shape') && SHAPE_NODE_TYPES.has(type)) return true;
            return false;
          });
          if (nodesToShow.length === 0) return null;
          const visibleNodes = nodesToShow.slice(0, visibleCount);
          const remainingCount = Math.max(0, nodesToShow.length - visibleNodes.length);
          return (
            <div className="bg-figma-bg/50 pt-0 pb-2 w-full">
              {visibleNodes.map((nodeRef, idx) => (
                <div
                  key={`${nodeRef.nodeId}-${nodeRef.propertyType}-${idx}`}
                  className="w-full py-2 px-4 hover:bg-figma-surface cursor-pointer flex items-center justify-between gap-3 text-xs"
                  onClick={() => onElementClick(nodeRef.nodeId)}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <NodeTypeIcon nodeType={nodeRef.nodeType} />
                    <div className="min-w-0">
                      <div className="text-figma-text truncate">{nodeRef.nodeName}</div>
                      <div className="text-figma-text-secondary text-xs truncate">
                        {nodeRef.layerPath}
                      </div>
                    </div>
                  </div>
                  <span className="text-figma-text-secondary shrink-0">
                    {nodeRef.propertyType}
                  </span>
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="py-2 px-4 text-center">
                  <button
                    type="button"
                    className="text-figma-blue text-xs hover:underline"
                    onClick={() =>
                      setVisibleCount((prev) =>
                        Math.min(nodesToShow.length, prev + VISIBLE_ELEMENTS_STEP)
                      )
                    }
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
        })()}
    </div>
  );
}
