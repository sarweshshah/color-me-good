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
      <div className="px-2.5 h-7 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-medium text-figma-text-secondary uppercase tracking-wider">
          {title}
        </span>
        {headerAction}
      </div>
      <div className="border-t border-figma-border" />
      <div className="flex flex-col pt-1.5 pb-2">{children}</div>
    </div>
  );
}
