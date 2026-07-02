import { ComponentChildren } from 'preact';

interface DropdownPanelProps {
  title: string;
  width?: string;
  headerAction?: ComponentChildren;
  children: ComponentChildren;
}

export function DropdownPanel({
  title,
  width = 'w-36',
  headerAction,
  children,
}: DropdownPanelProps) {
  return (
    <div
      className={`absolute right-0 top-full mt-0.5 ${width} bg-figma-surface rounded-lg border border-figma-border shadow-md z-50 overflow-hidden`}
    >
      <div className="py-1.5">
        <div className="px-3 py-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium text-figma-text-secondary uppercase tracking-wider">
            {title}
          </span>
          {headerAction}
        </div>
        <div className="w-full border-t border-figma-border" />
        <div className="w-full pt-2">{children}</div>
      </div>
    </div>
  );
}
