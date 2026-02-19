import { useState, useRef, useEffect } from 'preact/hooks';
import { SlidersVertical, ArrowUpDown, X, Search } from 'lucide-preact';
import { PropertyType } from '../../shared/types';

export type BindingFilter = 'all' | 'token-bound' | 'hard-coded';
export type SortOption = 'usage' | 'hex' | 'token';

const SORT_LABELS: Record<SortOption, string> = {
  usage: 'Usage (High → Low)',
  hex: 'Hex Value',
  token: 'Token Name',
};

interface SearchFilterBarProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  bindingFilter: BindingFilter;
  onBindingFilterChange: (filter: BindingFilter) => void;
  propertyFilters: Set<PropertyType>;
  onPropertyFilterToggle: (property: PropertyType) => void;
  onClearFilters: () => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  includeVectors: boolean;
  onIncludeVectorsChange: (include: boolean) => void;
}

export function SearchFilterBar({
  searchText,
  onSearchChange,
  bindingFilter,
  onBindingFilterChange,
  propertyFilters,
  onPropertyFilterToggle,
  onClearFilters,
  sortBy,
  onSortChange,
  includeVectors,
  onIncludeVectorsChange,
}: SearchFilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const activeFilterCount =
    (bindingFilter !== 'all' ? 1 : 0) + propertyFilters.size + (includeVectors ? 1 : 0);

  const hasActiveFilters =
    searchText.length > 0 || activeFilterCount > 0;

  const isSortCustom = sortBy !== 'usage';

  useEffect(() => {
    if (!filterOpen && !sortOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (filterOpen && filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
      if (sortOpen && sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen, sortOpen]);

  return (
    <div className="bg-figma-bg px-4 py-2.5 border-b border-figma-border">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-figma-surface rounded border border-figma-border focus-within:border-figma-blue">
          <Search size={14} className="ml-2.5 text-figma-text-secondary shrink-0" />
          <input
            type="text"
            value={searchText}
            onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
            placeholder="Search by hex, token name..."
            className="flex-1 bg-transparent text-figma-text text-xs py-2 pr-3 focus:outline-none"
          />
          {searchText.length > 0 && (
            <button
              onClick={() => onSearchChange('')}
              className="mr-2 text-figma-text-secondary hover:text-figma-text transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="relative" ref={sortRef}>
          <button
            onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false); }}
            className={`relative p-2 rounded border transition-colors ${
              sortOpen || isSortCustom
                ? 'bg-figma-blue border-figma-blue text-white'
                : 'bg-figma-surface border-figma-border text-figma-text-secondary hover:text-figma-text hover:border-figma-text-secondary'
            }`}
            title={`Sort: ${SORT_LABELS[sortBy]}`}
          >
            <ArrowUpDown size={14} />
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-figma-surface border border-figma-border rounded-lg shadow-lg z-50 py-2">
              <div className="px-3 py-1.5">
                <span className="text-figma-text text-xs font-semibold">Sort by</span>
              </div>
              <div className="mx-3 my-1.5 h-px bg-figma-border" />
              <div className="px-2 flex flex-col gap-0.5">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <MenuItem
                    key={key}
                    label={SORT_LABELS[key]}
                    active={sortBy === key}
                    onClick={() => { onSortChange(key); setSortOpen(false); }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={filterRef}>
          <button
            onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false); }}
            className={`relative p-2 rounded border transition-colors ${
              filterOpen || activeFilterCount > 0
                ? 'bg-figma-blue border-figma-blue text-white'
                : 'bg-figma-surface border-figma-border text-figma-text-secondary hover:text-figma-text hover:border-figma-text-secondary'
            }`}
            title="Filters"
          >
            <SlidersVertical size={14} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-figma-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-figma-surface border border-figma-border rounded-lg shadow-lg z-50 py-2">
              <div className="px-3 py-1.5 flex items-center justify-between">
                <span className="text-figma-text text-xs font-semibold">Filters</span>
                {hasActiveFilters && (
                  <button
                    onClick={() => { onClearFilters(); setFilterOpen(false); }}
                    className="text-[10px] text-figma-text-secondary hover:text-figma-blue transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="mx-3 my-1.5 h-px bg-figma-border" />

              <div className="px-3 py-1">
                <span className="text-[10px] text-figma-text-secondary uppercase tracking-wider font-medium">
                  Binding
                </span>
              </div>
              <div className="px-2 flex flex-col gap-0.5">
                <MenuItem
                  label="All"
                  active={bindingFilter === 'all'}
                  onClick={() => onBindingFilterChange('all')}
                />
                <MenuItem
                  label="Token-bound"
                  active={bindingFilter === 'token-bound'}
                  onClick={() => onBindingFilterChange('token-bound')}
                />
                <MenuItem
                  label="Hard-coded"
                  active={bindingFilter === 'hard-coded'}
                  onClick={() => onBindingFilterChange('hard-coded')}
                />
              </div>

              <div className="mx-3 my-1.5 h-px bg-figma-border" />

              <div className="px-3 py-1">
                <span className="text-[10px] text-figma-text-secondary uppercase tracking-wider font-medium">
                  Property
                </span>
              </div>
              <div className="px-2 flex flex-col gap-0.5">
                <MenuItem
                  label="Fill"
                  active={propertyFilters.has('fill')}
                  onClick={() => onPropertyFilterToggle('fill')}
                  checkbox
                />
                <MenuItem
                  label="Stroke"
                  active={propertyFilters.has('stroke')}
                  onClick={() => onPropertyFilterToggle('stroke')}
                  checkbox
                />
                <MenuItem
                  label="Text"
                  active={propertyFilters.has('text')}
                  onClick={() => onPropertyFilterToggle('text')}
                  checkbox
                />
                <MenuItem
                  label="Effect"
                  active={propertyFilters.has('effect')}
                  onClick={() => onPropertyFilterToggle('effect')}
                  checkbox
                />
              </div>

              <div className="mx-3 my-1.5 h-px bg-figma-border" />

              <div className="px-3 py-1">
                <span className="text-[10px] text-figma-text-secondary uppercase tracking-wider font-medium">
                  Scope
                </span>
              </div>
              <div className="px-2 flex flex-col gap-0.5">
                <MenuItem
                  label="Include vectors"
                  active={includeVectors}
                  onClick={() => onIncludeVectorsChange(!includeVectors)}
                  checkbox
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MenuItemProps {
  label: string;
  active: boolean;
  onClick: () => void;
  checkbox?: boolean;
}

function MenuItem({ label, active, onClick, checkbox }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2 transition-colors ${
        active
          ? 'bg-figma-blue/10 text-figma-blue'
          : 'text-figma-text hover:bg-figma-bg'
      }`}
    >
      {checkbox && (
        <span
          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
            active
              ? 'bg-figma-blue border-figma-blue'
              : 'border-figma-border'
          }`}
        >
          {active && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          )}
        </span>
      )}
      {!checkbox && active && (
        <span className="w-1.5 h-1.5 rounded-full bg-figma-blue shrink-0" />
      )}
      {label}
    </button>
  );
}
