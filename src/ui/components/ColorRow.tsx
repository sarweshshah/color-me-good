import { useState } from 'preact/hooks';
import { SerializedColorEntry } from '../../shared/types';
import { Swatch } from './Swatch';
import { formatHex } from '../utils/format';
import { copyColorToClipboard } from '../utils/clipboard';
import {
  Tags,
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
  onSelectAll: (color: SerializedColorEntry, event: MouseEvent) => void;
  onRowClick: (color: SerializedColorEntry, event: MouseEvent) => void;
  onElementClick: (nodeId: string) => void;
}

export function ColorRow({
  color,
  isSelected,
  onSelectAll,
  onRowClick,
  onElementClick,
}: ColorRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

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
      title="Token-bound color"
    >
      <Tags size={12} strokeWidth={2.25} />
    </span>
  ) : (
    <span className="text-figma-orange text-[10px] flex items-center gap-0.5">
      <Circle size={6} fill="currentColor" /> Hard-coded
    </span>
  );

  const libraryIcon = color.isLibraryVariable && (
    <span
      className="text-figma-text-secondary hover:text-figma-blue text-[10px] flex items-center transition-colors"
      title="Library variable"
    >
      <LibraryBig size={12} strokeWidth={1.75} />
    </span>
  );

  const handleCopy = async (e: Event) => {
    e.stopPropagation();
    const success = await copyColorToClipboard(color);
    if (success) {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1500);
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
          setIsExpanded(!isExpanded);
        }}
      >
        <div className="relative" onClick={handleCopy} title="Click to copy">
          <Swatch color={color} size={20} />
          {showCopied && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-figma-green text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Copied!
            </div>
          )}
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
            title={tooltipBreakdown || 'No elements'}
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
            title="Select all elements with this color"
          >
            <Crosshair size={12} />
          </button>
        </div>
      </div>

      {isExpanded &&
        (() => {
          const nodesToShow = color.nodes.filter((n) => n.propertyType !== 'text');
          if (nodesToShow.length === 0) return null;
          const slice = nodesToShow.slice(0, 20);
          return (
            <div className="bg-figma-bg/50 pt-0 pb-2 w-full">
              {slice.map((nodeRef, idx) => (
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
              {nodesToShow.length > 20 && (
                <div className="text-figma-text-secondary text-xs text-center py-2 px-4">
                  +{nodesToShow.length - 20} more elements
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
