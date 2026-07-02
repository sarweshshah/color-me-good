import { ScanContext } from '../../shared/types';
import { ScopeIndicator } from './ScopeIndicator';

interface HeaderProps {
  context: ScanContext | null;
  onClearScope: () => void;
}

export function Header({ context, onClearScope }: HeaderProps) {
  return (
    <header className="bg-figma-surface border-b border-figma-border px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <ScopeIndicator context={context} onClearScope={onClearScope} />
      </div>
    </header>
  );
}
