import { ScanContext } from '../../shared/types';
import { X, Layers } from 'lucide-preact';

interface HeaderProps {
  context: ScanContext | null;
  onClearScope: () => void;
}

export function Header({ context, onClearScope }: HeaderProps) {
  const isSelection = context?.mode === 'selection';
  const hasScope = isSelection && context.scopeNodeIds && context.scopeNodeIds.length > 0;
  const isMultiSelect = hasScope && context.scopeNodeIds!.length > 1;

  const scopeContent = !hasScope ? (
    <span className="text-figma-text-secondary font-medium">None</span>
  ) : isMultiSelect ? (
    <span className="text-figma-text font-medium inline-flex items-center gap-1">
      <Layers size={12} />
      {context.scopeNodeIds!.length}
    </span>
  ) : context.scopeNodeName ? (
    <span className="text-figma-text font-medium">{context.scopeNodeName}</span>
  ) : (
    <span className="text-figma-text font-medium">Entire Page</span>
  );

  return (
    <header className="bg-figma-surface border-b border-figma-border px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-figma-text font-semibold text-sm">Color Me Good</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-figma-bg px-3 py-1.5 rounded border border-figma-border text-xs">
          <span className="text-figma-text-secondary">Scope:</span>
          {scopeContent}
          {hasScope && (
            <button
              onClick={onClearScope}
              className="ml-1 text-figma-text-secondary hover:text-figma-text transition-colors"
              data-tooltip="Clear selection"
              data-tooltip-align="start"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
