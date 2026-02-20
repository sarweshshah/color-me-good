import { SerializedColorEntry } from '../../shared/types';
import { ColorRow } from './ColorRow';

interface ColorListProps {
  colors: SerializedColorEntry[];
  selectedIds: Set<string>;
  onSelectAll: (color: SerializedColorEntry, event: MouseEvent) => void;
  onRowClick: (color: SerializedColorEntry, event: MouseEvent) => void;
  onElementClick: (nodeId: string) => void;
}

export function ColorList({
  colors,
  selectedIds,
  onSelectAll,
  onRowClick,
  onElementClick,
}: ColorListProps) {
  if (colors.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-figma-text-secondary text-sm">
          No colors match your filters
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      {colors.map((color) => (
        <ColorRow
          key={color.dedupKey}
          color={color}
          isSelected={selectedIds.has(color.dedupKey)}
          onSelectAll={onSelectAll}
          onRowClick={onRowClick}
          onElementClick={onElementClick}
        />
      ))}
    </div>
  );
}
