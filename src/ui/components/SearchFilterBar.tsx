import { PropertyType } from '../../shared/types';

export type BindingFilter = 'all' | 'token-bound' | 'hard-coded';

interface SearchFilterBarProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  bindingFilter: BindingFilter;
  onBindingFilterChange: (filter: BindingFilter) => void;
  propertyFilters: Set<PropertyType>;
  onPropertyFilterToggle: (property: PropertyType) => void;
  onClearFilters: () => void;
}

export function SearchFilterBar({
  searchText,
  onSearchChange,
  bindingFilter,
  onBindingFilterChange,
  propertyFilters,
  onPropertyFilterToggle,
  onClearFilters,
}: SearchFilterBarProps) {
  const hasActiveFilters =
    searchText.length > 0 ||
    bindingFilter !== 'all' ||
    propertyFilters.size > 0;

  return (
    <div className="bg-figma-bg px-4 py-3 border-b border-figma-border space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={searchText}
          onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
          placeholder="Search by hex, token name..."
          className="flex-1 bg-figma-surface text-figma-text text-xs px-3 py-2 rounded border border-figma-border focus:border-figma-blue focus:outline-none"
        />
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-2 py-1.5 text-xs text-figma-text-secondary hover:text-figma-text transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          label="All"
          active={bindingFilter === 'all'}
          onClick={() => onBindingFilterChange('all')}
        />
        <FilterChip
          label="Token-bound"
          active={bindingFilter === 'token-bound'}
          onClick={() => onBindingFilterChange('token-bound')}
        />
        <FilterChip
          label="Hard-coded"
          active={bindingFilter === 'hard-coded'}
          onClick={() => onBindingFilterChange('hard-coded')}
        />

        <div className="w-px h-4 bg-figma-border" />

        <FilterChip
          label="Fill"
          active={propertyFilters.has('fill')}
          onClick={() => onPropertyFilterToggle('fill')}
        />
        <FilterChip
          label="Stroke"
          active={propertyFilters.has('stroke')}
          onClick={() => onPropertyFilterToggle('stroke')}
        />
        <FilterChip
          label="Text"
          active={propertyFilters.has('text')}
          onClick={() => onPropertyFilterToggle('text')}
        />
        <FilterChip
          label="Effect"
          active={propertyFilters.has('effect')}
          onClick={() => onPropertyFilterToggle('effect')}
        />
      </div>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded transition-colors ${
        active
          ? 'bg-figma-blue text-white'
          : 'bg-figma-surface text-figma-text-secondary hover:text-figma-text hover:bg-figma-surface/80'
      }`}
    >
      {label}
    </button>
  );
}
