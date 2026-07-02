import { ComponentChildren } from 'preact';

interface ToolbarButtonProps {
  active?: boolean;
  tooltip?: string;
  tooltipAlign?: 'start' | 'end';
  onClick: () => void;
  children: ComponentChildren;
  badge?: number;
}

export function ToolbarButton({
  active = false,
  tooltip,
  tooltipAlign = 'end',
  onClick,
  children,
  badge,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
        active
          ? 'bg-figma-brand border-figma-brand text-figma-onbrand shadow-sm'
          : 'bg-figma-surface border-figma-border text-figma-text-secondary hover:text-figma-text hover:border-figma-text-secondary/60 hover:bg-figma-bg active:bg-figma-border/30'
      }`}
      data-tooltip={tooltip}
      data-tooltip-align={tooltipAlign}
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 bg-figma-orange text-white text-[10px] font-medium rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}
