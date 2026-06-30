import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import {
  Filter,
  ArrowUpDown,
  X,
  Search,
  Type,
  Square,
  Frame,
  Layout,
  Layers,
  Component,
  Box,
  PenTool,
  EyeOff,
  Download,
} from 'lucide-preact';
import { PropertyType } from '../../shared/types';
import type { ExportFormat } from '../utils/export';

export type BindingFilter = 'all' | 'token-bound' | 'hard-coded';
export type SortOption = 'usage' | 'color' | 'token';
export type SortDirection = 'asc' | 'desc';

const SORT_LABELS: Record<SortOption, string> = {
  usage: 'Usage Count',
  color: 'Color',
  token: 'Token Name',
};

const SORT_OPTIONS: SortOption[] = ['token', 'usage', 'color'];

const NODE_TYPE_OPTIONS: { value: string; label: string; icon: typeof Type }[] = [
  { value: 'Shape', label: 'Shape', icon: Square },
  { value: 'FRAME', label: 'Frame', icon: Frame },
  { value: 'SECTION', label: 'Section', icon: Layout },
  { value: 'GROUP', label: 'Group', icon: Layers },
  { value: 'COMPONENT', label: 'Component', icon: Component },
  { value: 'INSTANCE', label: 'Instance', icon: Box },
  { value: 'VECTOR', label: 'Vector', icon: PenTool },
];

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

  const nodeTypeOptionsFiltered = includeVectors
    ? NODE_TYPE_OPTIONS
    : NODE_TYPE_OPTIONS.filter((o) => o.value !== 'VECTOR');

  const hasActiveFilters = searchText.length > 0 || activeFilterCount > 0;

  const isSortCustom = sortBy !== 'token';

  const handleExport = useCallback(
    (format: ExportFormat) => {
      setExportOpen(false);
      onExport?.(format);
    },
    [onExport]
  );

  useEffect(() => {
    if (!filterOpen && !sortOpen && !exportOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        filterOpen &&
        filterRef.current &&
        !filterRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
      if (sortOpen && sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
      if (
        exportOpen &&
        exportRef.current &&
        !exportRef.current.contains(e.target as Node)
      ) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen, sortOpen, exportOpen]);

  return (
    <div className="px-2 py-2 border-b border-figma-border-strong bg-figma-bg">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 min-h-8 min-w-0 bg-figma-surface rounded-md border border-figma-border focus-within:border-figma-blue/50 transition-colors">
          <Search size={14} className="ml-3 text-figma-icon shrink-0" />
          <input
            type="text"
            value={searchText}
            onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
            placeholder="Search hex, token…"
            className="flex-1 min-w-0 h-8 bg-transparent text-figma-text text-xs leading-8 pr-2 focus:outline-none placeholder:text-figma-text-secondary/70"
          />
          {searchText.length > 0 && (
            <button
              onClick={() => onSearchChange('')}
              className="mr-2 p-0.5 rounded text-figma-text-secondary/70 hover:text-figma-text hover:bg-figma-border/40 transition-colors"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => {
                setSortOpen(!sortOpen);
                setFilterOpen(false);
                setExportOpen(false);
              }}
              className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
                sortOpen || isSortCustom
                  ? 'bg-figma-brand border-figma-brand text-figma-onbrand shadow-sm'
                  : 'bg-figma-surface border-figma-border text-figma-text-secondary hover:text-figma-text hover:border-figma-text-secondary/60 hover:bg-figma-bg active:bg-figma-border/30'
              }`}
              data-tooltip={`Sort: ${SORT_LABELS[sortBy]} (${sortDirection === 'asc' ? 'Ascending' : 'Descending'})`}
              data-tooltip-align="end"
            >
              <ArrowUpDown size={14} strokeWidth={2} />
            </button>

            {sortOpen && (
              <div className="absolute right-0 top-full mt-0.5 w-36 bg-figma-surface rounded-lg border border-figma-border shadow-md z-50 overflow-hidden">
                <div className="py-1.5">
                  <div className="px-3 py-1.5">
                    <span className="text-[11px] font-medium text-figma-text-secondary uppercase tracking-wider">
                      Sort by
                    </span>
                  </div>
                  <div className="w-full border-t border-figma-border" />
                  <div className="w-full pt-2">
                    {SORT_OPTIONS.map((key) => (
                      <MenuItem
                        key={key}
                        label={
                          sortBy === key
                            ? `${SORT_LABELS[key]} ${sortDirection === 'asc' ? '↑' : '↓'}`
                            : SORT_LABELS[key]
                        }
                        active={sortBy === key}
                        onClick={() => {
                          onSortChange(key);
                          if (key !== sortBy) {
                            setSortOpen(false);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={filterRef}>
            <button
              onClick={() => {
                setFilterOpen(!filterOpen);
                setSortOpen(false);
                setExportOpen(false);
              }}
              className={`relative flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
                filterOpen || activeFilterCount > 0
                  ? 'bg-figma-brand border-figma-brand text-figma-onbrand shadow-sm'
                  : 'bg-figma-surface border-figma-border text-figma-text-secondary hover:text-figma-text hover:border-figma-text-secondary/60 hover:bg-figma-bg active:bg-figma-border/30'
              }`}
              data-tooltip="Filters"
              data-tooltip-align="end"
            >
              <Filter size={14} strokeWidth={2} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 bg-figma-orange text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-figma-surface rounded-lg border border-figma-border shadow-md z-50 overflow-hidden">
                <div className="py-1.5">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-figma-text-secondary uppercase tracking-wider">
                      Filters
                    </span>
                    {hasActiveFilters && (
                      <button
                        onClick={() => {
                          onClearFilters();
                          setFilterOpen(false);
                        }}
                        className="text-[11px] text-figma-blue hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="w-full border-t border-figma-border pb-1" />

                  <SectionLabel label="Visibility" />
                  <div className="w-full">
                    <MenuItem
                      label="Hidden only"
                      icon={
                        <EyeOff
                          size={14}
                          className="shrink-0 text-figma-text-secondary/60"
                        />
                      }
                      active={hiddenOnlyFilter}
                      onClick={() => {
                        onHiddenOnlyFilterToggle();
                      }}
                      checkbox
                    />
                  </div>

                  <SectionLabel label="Property" />
                  <div className="w-full">
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
                      label="Effect"
                      active={propertyFilters.has('effect')}
                      onClick={() => onPropertyFilterToggle('effect')}
                      checkbox
                    />
                  </div>

                  <SectionLabel label="Node type" />
                  <div className="w-full">
                    <MenuItem
                      label="Text"
                      icon={
                        <Type
                          size={14}
                          className="shrink-0 text-figma-text-secondary/60"
                        />
                      }
                      active={propertyFilters.has('text')}
                      onClick={() => onPropertyFilterToggle('text')}
                      checkbox
                    />
                    {nodeTypeOptionsFiltered.map(({ value, label, icon: Icon }) => (
                      <MenuItem
                        key={value}
                        label={label}
                        icon={
                          Icon ? (
                            <Icon
                              size={14}
                              className="shrink-0 text-figma-text-secondary/60"
                            />
                          ) : null
                        }
                        active={nodeTypeFilters.has(value)}
                        onClick={() => onNodeTypeFilterToggle(value)}
                        checkbox
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {onExport && (
            <>
              <div className="w-px h-5 bg-figma-border" />

              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => {
                    setExportOpen(!exportOpen);
                    setFilterOpen(false);
                    setSortOpen(false);
                  }}
                  className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
                    exportOpen
                      ? 'bg-figma-brand border-figma-brand text-figma-onbrand shadow-sm'
                      : 'bg-figma-surface border-figma-border text-figma-text-secondary hover:text-figma-text hover:border-figma-text-secondary/60 hover:bg-figma-bg active:bg-figma-border/30'
                  }`}
                  data-tooltip="Export"
                  data-tooltip-align="end"
                >
                  <Download size={14} strokeWidth={2} />
                </button>

                {exportOpen && (
                  <div className="absolute right-0 top-full mt-0.5 w-36 bg-figma-surface rounded-lg border border-figma-border shadow-md z-50 overflow-hidden">
                    <div className="py-1.5">
                      <div className="px-3 py-1.5">
                        <span className="text-[11px] font-medium text-figma-text-secondary uppercase tracking-wider">
                          Export as
                        </span>
                      </div>
                      <div className="w-full border-t border-figma-border" />
                      <div className="w-full pt-2">
                        <MenuItem
                          label="Copy colors"
                          active={false}
                          onClick={() => handleExport('clipboard')}
                        />
                        <MenuItem
                          label="JSON"
                          active={false}
                          onClick={() => handleExport('json')}
                        />
                        <MenuItem
                          label="CSV"
                          active={false}
                          onClick={() => handleExport('csv')}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pt-2 pb-1">
      <span className="text-[10px] font-medium text-figma-text-secondary uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

interface MenuItemProps {
  label: string;
  icon?: preact.ComponentChildren;
  active: boolean;
  onClick: () => void;
  checkbox?: boolean;
}

function MenuItem({ label, icon, active, onClick, checkbox }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1 text-xs rounded-none flex items-center gap-2.5 transition-colors ${
        active
          ? 'bg-figma-blue/8 text-figma-blue font-medium'
          : 'text-figma-text hover:bg-figma-bg/80'
      }`}
    >
      {checkbox && (
        <span
          className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
            active
              ? 'bg-figma-blue border-figma-blue'
              : 'border-figma-border/80 bg-figma-surface'
          }`}
        >
          {active && (
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1.5 4L3.2 5.7L6.5 2.3" />
            </svg>
          )}
        </span>
      )}
      {!checkbox && active && (
        <span className="w-1.5 h-1.5 rounded-full bg-figma-blue shrink-0" />
      )}
      {icon}
      {label}
    </button>
  );
}
