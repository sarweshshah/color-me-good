import { ScanContext } from '../../shared/types';

interface HeaderProps {
  context: ScanContext | null;
  onClearScope: () => void;
}

export function Header({ context, onClearScope }: HeaderProps) {
  const scopeText =
    context?.mode === 'selection' && context.scopeNodeName
      ? context.scopeNodeName
      : 'Entire Page';

  const showClearButton = context?.mode === 'selection';

  return (
    <header className="bg-figma-surface border-b border-figma-border px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-figma-text font-semibold text-base">Color Inspector</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-figma-bg px-3 py-1.5 rounded text-xs">
          <span className="text-figma-text-secondary">Scope:</span>
          <span className="text-figma-text font-medium">{scopeText}</span>
          {showClearButton && (
            <button
              onClick={onClearScope}
              className="ml-1 text-figma-text-secondary hover:text-figma-text transition-colors"
              title="Clear scope and scan entire page"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
