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
    <span className="text-figma-text-secondary font-medium truncate min-w-0">None</span>
  ) : isMultiSelect ? (
    <span className="text-figma-text font-medium inline-flex items-center gap-1 shrink-0">
      <Layers size={12} />
      {context.scopeNodeIds!.length}
    </span>
  ) : context.scopeNodeName ? (
    <span
      className="text-figma-text font-medium truncate min-w-0"
      data-tooltip={context.scopeNodeName}
      data-tooltip-align="start"
    >
      {context.scopeNodeName}
    </span>
  ) : (
    <span className="text-figma-text font-medium truncate min-w-0">Entire Page</span>
  );

  return (
    <header className="bg-figma-surface border-b border-figma-border px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="inline-flex items-center gap-2 min-w-0 max-w-full bg-figma-bg px-3 py-1.5 rounded border border-figma-border text-xs overflow-hidden">
          <span className="text-figma-text-secondary shrink-0">Scope:</span>
          {scopeContent}
          {hasScope && (
            <button
              onClick={onClearScope}
              className="shrink-0 text-figma-text-secondary hover:text-figma-text transition-colors"
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
