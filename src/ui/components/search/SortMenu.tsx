import { ArrowUpDown } from 'lucide-preact';
import { ToolbarButton } from '../ui/ToolbarButton';
import { DropdownPanel } from '../ui/DropdownPanel';
import { MenuItem } from '../ui/MenuItem';
import { SORT_LABELS, SORT_OPTIONS, SortDirection, SortOption } from '../../types/filters';

interface SortMenuProps {
  open: boolean;
  sortBy: SortOption;
  sortDirection: SortDirection;
  onToggle: () => void;
  onSortChange: (sort: SortOption) => void;
  onClose: () => void;
  menuRef: preact.RefObject<HTMLDivElement>;
}

export function SortMenu({
  open,
  sortBy,
  sortDirection,
  onToggle,
  onSortChange,
  onClose,
  menuRef,
}: SortMenuProps) {
  const isSortCustom = sortBy !== 'token';

  return (
    <div className="relative" ref={menuRef}>
      <ToolbarButton
        active={open || isSortCustom}
        tooltip={`Sort: ${SORT_LABELS[sortBy]} (${sortDirection === 'asc' ? 'Ascending' : 'Descending'})`}
        onClick={onToggle}
      >
        <ArrowUpDown size={14} strokeWidth={2} />
      </ToolbarButton>

      {open && (
        <DropdownPanel title="Sort by">
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
                if (key !== sortBy) onClose();
              }}
            />
          ))}
        </DropdownPanel>
      )}
    </div>
  );
}
