import { ScanContext } from '../../shared/types';
import { ScopeIndicator } from './ScopeIndicator';

interface HeaderProps {
  context: ScanContext | null;
  onClearScope: () => void;
}

export function Header({ context, onClearScope }: HeaderProps) {
  return (
    <header>
      <ScopeIndicator context={context} onClearScope={onClearScope} />
    </header>
  );
}
