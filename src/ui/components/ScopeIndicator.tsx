import { ScanContext } from '../../shared/types';
import { X, Layers, Crosshair } from 'lucide-preact';

interface ScopeIndicatorProps {
  context: ScanContext | null;
  onClearScope: () => void;
}

export function ScopeIndicator({ context, onClearScope }: ScopeIndicatorProps) {
  const isSelection = context?.mode === 'selection';
  const hasScope = isSelection && context.scopeNodeIds && context.scopeNodeIds.length > 0;
  const isMultiSelect = hasScope && context.scopeNodeIds!.length > 1;

  const scopeLabel = !hasScope
    ? 'None'
    : isMultiSelect
      ? `${context.scopeNodeIds!.length} layers`
      : context.scopeNodeName || 'Entire Page';

  return (
    <div className="scope-bar flex items-center gap-2.5 w-full min-w-0 h-8 px-3">
      <span className="flex items-center justify-center shrink-0 text-figma-text-tertiary">
        {isMultiSelect ? <Layers size={13} strokeWidth={1.75} /> : <Crosshair size={13} strokeWidth={1.75} />}
      </span>

      <div className="flex items-baseline gap-2 min-w-0 flex-1">
        <span className="shrink-0 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-figma-text-tertiary">
          Scope
        </span>
        <span
          className={`text-[11px] font-medium truncate min-w-0 ${
            hasScope ? 'text-figma-text' : 'text-figma-text-secondary'
          }`}
          data-tooltip={hasScope && !isMultiSelect && context.scopeNodeName ? context.scopeNodeName : undefined}
          data-tooltip-align="start"
          data-tooltip-position="below"
        >
          {scopeLabel}
        </span>
      </div>

      {hasScope && (
        <button
          type="button"
          onClick={onClearScope}
          className="shrink-0 flex items-center justify-center w-6 h-6 -mr-1 rounded-sm text-figma-text-tertiary hover:text-figma-text hover:bg-figma-bg-hover transition-colors"
          data-tooltip="Clear selection"
          data-tooltip-align="end"
          data-tooltip-position="below"
          aria-label="Clear selection"
        >
          <X size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
