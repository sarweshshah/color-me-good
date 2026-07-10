import { ComponentChildren } from 'preact';

interface ToolbarButtonProps {
  active?: boolean;
  tooltip?: string;
  tooltipAlign?: 'start' | 'end';
  tooltipPosition?: 'above' | 'below';
  onClick: () => void;
  children: ComponentChildren;
  badge?: number;
}

export function ToolbarButton({
  active = false,
  tooltip,
  tooltipAlign = 'end',
  tooltipPosition = 'below',
  onClick,
  children,
  badge,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center justify-center w-8 h-full overflow-visible transition-colors ${
        active
          ? 'bg-figma-brand text-figma-onbrand'
          : 'bg-figma-bg text-figma-text-secondary hover:text-figma-text hover:bg-figma-bg-hover'
      }`}
      data-tooltip={tooltip}
      data-tooltip-align={tooltipAlign}
      data-tooltip-position={tooltipPosition}
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute top-0.5 right-0.5 z-10 min-w-[14px] h-3.5 px-1 bg-figma-orange text-white text-[10px] font-medium rounded-full flex items-center justify-center leading-none pointer-events-none">
          {badge}
        </span>
      )}
    </button>
  );
}
