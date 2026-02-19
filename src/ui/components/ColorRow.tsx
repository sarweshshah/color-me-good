import { useState } from 'preact/hooks';
import { SerializedColorEntry } from '../../shared/types';
import { Swatch } from './Swatch';
import { formatHex } from '../utils/format';
import { copyColorToClipboard } from '../utils/clipboard';

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

  const displayName =
    color.tokenName || (color.hex ? formatHex(color.hex) : 'Gradient');

  const badge = color.isTokenBound ? (
    <span className="text-figma-green text-xs">✓ Token</span>
  ) : (
    <span className="text-figma-orange text-xs">● Hard-coded</span>
  );

  const libraryIcon = color.isLibraryVariable && (
    <span className="text-figma-blue text-xs" title="Library variable">
      📚
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
    <div className={`border-b border-figma-border ${isSelected ? 'bg-figma-blue/10' : ''}`}>
      <div
        className="px-4 py-2.5 hover:bg-figma-surface/50 cursor-pointer flex items-center gap-3"
        onClick={(e) => {
          onRowClick(color, e as unknown as MouseEvent);
          setIsExpanded(!isExpanded);
        }}
      >
        <div
          className="relative"
          onClick={handleCopy}
          title="Click to copy"
        >
          <Swatch color={color} size={24} />
          {showCopied && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-figma-green text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Copied!
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-figma-text text-sm font-medium truncate">
              {displayName}
            </span>
            {libraryIcon}
            {badge}
          </div>
          {color.tokenName && color.hex && (
            <div className="text-figma-text-secondary text-xs mt-0.5">
              {formatHex(color.hex)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-figma-text-secondary text-xs">
            {color.usageCount}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectAll(color, e as unknown as MouseEvent);
            }}
            className="px-2 py-1 text-xs bg-figma-blue text-white rounded hover:bg-figma-blue/80 transition-colors"
          >
            Select All
          </button>
        </div>
      </div>

      {isExpanded && color.nodes.length > 0 && (
        <div className="bg-figma-bg/50 px-4 py-2">
          {color.nodes.slice(0, 20).map((nodeRef, idx) => (
            <div
              key={`${nodeRef.nodeId}-${idx}`}
              className="py-1.5 px-2 hover:bg-figma-surface rounded cursor-pointer flex items-center justify-between text-xs"
              onClick={() => onElementClick(nodeRef.nodeId)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-figma-text truncate">{nodeRef.nodeName}</div>
                <div className="text-figma-text-secondary text-xs truncate">
                  {nodeRef.layerPath}
                </div>
              </div>
              <span className="text-figma-text-secondary ml-2">
                {nodeRef.propertyType}
              </span>
            </div>
          ))}
          {color.nodes.length > 20 && (
            <div className="text-figma-text-secondary text-xs text-center py-2">
              +{color.nodes.length - 20} more elements
            </div>
          )}
        </div>
      )}
    </div>
  );
}
