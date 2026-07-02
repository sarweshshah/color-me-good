import { Download } from 'lucide-preact';
import type { ExportFormat } from '../../utils/export';
import { ToolbarButton } from '../ui/ToolbarButton';
import { DropdownPanel } from '../ui/DropdownPanel';
import { MenuItem } from '../ui/MenuItem';

interface ExportMenuProps {
  open: boolean;
  onToggle: () => void;
  onExport: (format: ExportFormat) => void;
  onClose: () => void;
  menuRef: preact.RefObject<HTMLDivElement>;
}

export function ExportMenu({ open, onToggle, onExport, onClose, menuRef }: ExportMenuProps) {
  const handleExport = (format: ExportFormat) => {
    onClose();
    onExport(format);
  };

  return (
    <div className="relative" ref={menuRef}>
      <ToolbarButton active={open} tooltip="Export" onClick={onToggle}>
        <Download size={14} strokeWidth={2} />
      </ToolbarButton>

      {open && (
        <DropdownPanel title="Export as">
          <MenuItem
            label="Copy colors"
            active={false}
            onClick={() => handleExport('clipboard')}
          />
          <MenuItem label="JSON" active={false} onClick={() => handleExport('json')} />
          <MenuItem label="CSV" active={false} onClick={() => handleExport('csv')} />
        </DropdownPanel>
      )}
    </div>
  );
}
