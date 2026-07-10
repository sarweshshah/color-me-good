import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import { PropertyType } from '../../shared/types';
import type { ExportFormat } from '../utils/export';
import { SortDirection, SortOption } from '../types/filters';
import { SearchInput } from './search/SearchInput';
import { SortMenu } from './search/SortMenu';
import { FilterMenu } from './search/FilterMenu';
import { ExportMenu } from './search/ExportMenu';

export type { BindingFilter, SortOption, SortDirection } from '../types/filters';

interface SearchFilterBarProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  propertyFilters: Set<PropertyType>;
  onPropertyFilterToggle: (property: PropertyType) => void;
  nodeTypeFilters: Set<string>;
  onNodeTypeFilterToggle: (nodeType: string) => void;
  hiddenOnlyFilter: boolean;
  onHiddenOnlyFilterToggle: () => void;
  onClearFilters: () => void;
  sortBy: SortOption;
  sortDirection: SortDirection;
  onSortChange: (sort: SortOption) => void;
  includeVectors: boolean;
  onExport?: (format: ExportFormat) => void | Promise<void>;
}

export function SearchFilterBar({
  searchText,
  onSearchChange,
  propertyFilters,
  onPropertyFilterToggle,
  nodeTypeFilters,
  onNodeTypeFilterToggle,
  hiddenOnlyFilter,
  onHiddenOnlyFilterToggle,
  onClearFilters,
  sortBy,
  sortDirection,
  onSortChange,
  includeVectors,
  onExport,
}: SearchFilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const activeFilterCount =
    propertyFilters.size + nodeTypeFilters.size + (hiddenOnlyFilter ? 1 : 0);
  const hasActiveFilters = searchText.length > 0 || activeFilterCount > 0;

  const closeAll = useCallback(() => {
    setFilterOpen(false);
    setSortOpen(false);
    setExportOpen(false);
  }, []);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      onExport?.(format);
    },
    [onExport]
  );

  useEffect(() => {
    if (!filterOpen && !sortOpen && !exportOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (filterOpen && filterRef.current && !filterRef.current.contains(target)) {
        setFilterOpen(false);
      }
      if (sortOpen && sortRef.current && !sortRef.current.contains(target)) {
        setSortOpen(false);
      }
      if (exportOpen && exportRef.current && !exportRef.current.contains(target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen, sortOpen, exportOpen]);

  return (
    <div className="chrome-toolbar bg-figma-bg overflow-visible">
      <div className="flex items-center h-9 overflow-visible">
        <SearchInput value={searchText} onChange={onSearchChange} />

        <div className="flex items-center shrink-0 h-full overflow-visible">
          <SortMenu
            open={sortOpen}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onToggle={() => {
              setSortOpen(!sortOpen);
              setFilterOpen(false);
              setExportOpen(false);
            }}
            onSortChange={onSortChange}
            onClose={() => setSortOpen(false)}
            menuRef={sortRef}
          />

          <FilterMenu
            open={filterOpen}
            activeFilterCount={activeFilterCount}
            hasActiveFilters={hasActiveFilters}
            propertyFilters={propertyFilters}
            nodeTypeFilters={nodeTypeFilters}
            hiddenOnlyFilter={hiddenOnlyFilter}
            includeVectors={includeVectors}
            onToggle={() => {
              setFilterOpen(!filterOpen);
              setSortOpen(false);
              setExportOpen(false);
            }}
            onPropertyFilterToggle={onPropertyFilterToggle}
            onNodeTypeFilterToggle={onNodeTypeFilterToggle}
            onHiddenOnlyFilterToggle={onHiddenOnlyFilterToggle}
            onClearFilters={onClearFilters}
            onClose={closeAll}
            menuRef={filterRef}
          />

          {onExport && (
            <ExportMenu
              open={exportOpen}
              onToggle={() => {
                setExportOpen(!exportOpen);
                setFilterOpen(false);
                setSortOpen(false);
              }}
              onExport={handleExport}
              onClose={() => setExportOpen(false)}
              menuRef={exportRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}
