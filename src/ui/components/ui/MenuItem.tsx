import { ComponentChildren } from 'preact';

export interface MenuItemProps {
  label: string;
  icon?: ComponentChildren;
  active: boolean;
  onClick: () => void;
  checkbox?: boolean;
}

export function MenuItem({ label, icon, active, onClick, checkbox }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1 text-xs rounded-none flex items-center gap-2.5 transition-colors ${
        active
          ? 'bg-figma-blue/8 text-figma-blue font-medium'
          : 'text-figma-text hover:bg-figma-bg/80'
      }`}
    >
      {checkbox && (
        <span
          className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
            active
              ? 'bg-figma-blue border-figma-blue'
              : 'border-figma-border/80 bg-figma-surface'
          }`}
        >
          {active && (
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1.5 4L3.2 5.7L6.5 2.3" />
            </svg>
          )}
        </span>
      )}
      {!checkbox && active && (
        <span className="w-1.5 h-1.5 rounded-full bg-figma-blue shrink-0" />
      )}
      {icon}
      {label}
    </button>
  );
}
