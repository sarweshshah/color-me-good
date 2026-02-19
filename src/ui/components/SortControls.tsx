export type SortOption = 'usage' | 'hex' | 'token';

interface SortControlsProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function SortControls({ sortBy, onSortChange }: SortControlsProps) {
  return (
    <div className="bg-figma-bg px-4 py-2 border-b border-figma-border">
      <div className="flex items-center gap-2">
        <span className="text-figma-text-secondary text-xs">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) =>
            onSortChange((e.target as HTMLSelectElement).value as SortOption)
          }
          className="flex-1 bg-figma-surface text-figma-text text-xs px-2 py-1.5 rounded border border-figma-border focus:border-figma-blue focus:outline-none"
        >
          <option value="usage">Usage (High → Low)</option>
          <option value="hex">Hex Value</option>
          <option value="token">Token Name</option>
        </select>
      </div>
    </div>
  );
}
