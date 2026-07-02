import {
  Filter,
  Type,
  Square,
  Frame,
  Layout,
  Layers,
  Component,
  Box,
  PenTool,
  EyeOff,
} from 'lucide-preact';
import { PropertyType } from '../../../shared/types';
import { ToolbarButton } from '../ui/ToolbarButton';
import { DropdownPanel } from '../ui/DropdownPanel';
import { MenuItem } from '../ui/MenuItem';
import { SectionLabel } from '../ui/SectionLabel';

const NODE_TYPE_OPTIONS: { value: string; label: string; icon: typeof Type }[] = [
  { value: 'Shape', label: 'Shape', icon: Square },
  { value: 'FRAME', label: 'Frame', icon: Frame },
  { value: 'SECTION', label: 'Section', icon: Layout },
  { value: 'GROUP', label: 'Group', icon: Layers },
  { value: 'COMPONENT', label: 'Component', icon: Component },
  { value: 'INSTANCE', label: 'Instance', icon: Box },
  { value: 'VECTOR', label: 'Vector', icon: PenTool },
];

interface FilterMenuProps {
  open: boolean;
  activeFilterCount: number;
  hasActiveFilters: boolean;
  propertyFilters: Set<PropertyType>;
  nodeTypeFilters: Set<string>;
  hiddenOnlyFilter: boolean;
  includeVectors: boolean;
  onToggle: () => void;
  onPropertyFilterToggle: (property: PropertyType) => void;
  onNodeTypeFilterToggle: (nodeType: string) => void;
  onHiddenOnlyFilterToggle: () => void;
  onClearFilters: () => void;
  onClose: () => void;
  menuRef: preact.RefObject<HTMLDivElement>;
}

export function FilterMenu({
  open,
  activeFilterCount,
  hasActiveFilters,
  propertyFilters,
  nodeTypeFilters,
  hiddenOnlyFilter,
  includeVectors,
  onToggle,
  onPropertyFilterToggle,
  onNodeTypeFilterToggle,
  onHiddenOnlyFilterToggle,
  onClearFilters,
  onClose,
  menuRef,
}: FilterMenuProps) {
  const nodeTypeOptions = includeVectors
    ? NODE_TYPE_OPTIONS
    : NODE_TYPE_OPTIONS.filter((o) => o.value !== 'VECTOR');

  return (
    <div className="relative" ref={menuRef}>
      <ToolbarButton
        active={open || activeFilterCount > 0}
        tooltip="Filters"
        onClick={onToggle}
        badge={activeFilterCount}
      >
        <Filter size={14} strokeWidth={2} />
      </ToolbarButton>

      {open && (
        <DropdownPanel
          title="Filters"
          width="w-52"
          headerAction={
            hasActiveFilters ? (
              <button
                onClick={() => {
                  onClearFilters();
                  onClose();
                }}
                className="text-[11px] text-figma-blue hover:underline"
              >
                Clear all
              </button>
            ) : undefined
          }
        >
          <SectionLabel label="Visibility" />
          <div className="w-full">
            <MenuItem
              label="Hidden only"
              icon={<EyeOff size={14} className="shrink-0 text-figma-text-secondary/60" />}
              active={hiddenOnlyFilter}
              onClick={onHiddenOnlyFilterToggle}
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
              icon={<Type size={14} className="shrink-0 text-figma-text-secondary/60" />}
              active={propertyFilters.has('text')}
              onClick={() => onPropertyFilterToggle('text')}
              checkbox
            />
            {nodeTypeOptions.map(({ value, label, icon: Icon }) => (
              <MenuItem
                key={value}
                label={label}
                icon={
                  Icon ? (
                    <Icon size={14} className="shrink-0 text-figma-text-secondary/60" />
                  ) : null
                }
                active={nodeTypeFilters.has(value)}
                onClick={() => onNodeTypeFilterToggle(value)}
                checkbox
              />
            ))}
          </div>
        </DropdownPanel>
      )}
    </div>
  );
}
