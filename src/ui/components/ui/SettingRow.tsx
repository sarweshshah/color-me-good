interface SettingRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function SettingRow({ label, description, checked, onChange }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-xs text-figma-text font-medium">{label}</div>
        {description && (
          <div className="text-[10px] text-figma-text-secondary mt-0.5">{description}</div>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`shrink-0 w-7 h-4 rounded-full transition-colors flex items-center ${
          checked ? 'bg-figma-blue' : 'bg-figma-border'
        }`}
      >
        <span
          className="block w-3 h-3 rounded-full bg-figma-onbrand shadow-sm transition-transform"
          style={{ transform: checked ? 'translateX(13px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  );
}
