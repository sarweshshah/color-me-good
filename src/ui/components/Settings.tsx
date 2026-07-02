import { Monitor, Moon, Sun } from 'lucide-preact';
import { PluginSettings, ColorDisplayFormat } from '../../shared/messages';
import { SettingRow } from './ui/SettingRow';
import { SettingsSection } from './ui/SettingsSection';

const THEME_OPTIONS = [
  { value: 'system' as const, label: 'System', icon: Monitor },
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
];

interface SettingsProps {
  settings: PluginSettings | null;
  onSettingChange: <K extends keyof PluginSettings>(
    key: K,
    value: PluginSettings[K]
  ) => void;
}

export function Settings({ settings, onSettingChange }: SettingsProps) {
  if (!settings) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-figma-surface">
        <span className="text-figma-text-secondary text-sm">Loading settings…</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-figma-surface">
      <SettingsSection title="Scan">
        <SettingRow
          label="Include vectors"
          description="Include vector nodes (e.g. shapes, paths) in the scan."
          checked={settings.includeVectors}
          onChange={(v) => onSettingChange('includeVectors', v)}
        />
        {settings.includeVectors && (
          <div className="pl-4 border-l-2 border-figma-border ml-1">
            <SettingRow
              label="Include boolean children"
              description="Surface fills and strokes from paths inside boolean groups (union, subtract, etc.)."
              checked={settings.includeBooleanChildren}
              onChange={(v) => onSettingChange('includeBooleanChildren', v)}
            />
          </div>
        )}
        <SettingRow
          label="Expand gradients"
          description="Also surface each gradient stop as an individual solid color."
          checked={settings.expandGradients}
          onChange={(v) => onSettingChange('expandGradients', v)}
        />
        <SettingRow
          label="Include hidden layers"
          description="Include hidden (invisible) layers in the scan results."
          checked={settings.includeHiddenLayers}
          onChange={(v) => onSettingChange('includeHiddenLayers', v)}
        />
      </SettingsSection>

      <SettingsSection title="Behavior">
        <SettingRow
          label="Smooth zoom"
          description="Animate viewport when zooming to an element."
          checked={settings.smoothZoom}
          onChange={(v) => onSettingChange('smoothZoom', v)}
        />
      </SettingsSection>

      <SettingsSection title="Display">
        <div className="py-2">
          <div className="text-xs text-figma-text font-medium">UI theme</div>
          <div className="text-[10px] text-figma-text-secondary mt-0.5 mb-2">
            Choose light, dark, or follow system preference.
          </div>
          <div className="flex gap-2 mb-4">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onSettingChange('uiTheme', value)}
                className={`flex-1 px-3 py-2 rounded-md border text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
                  (settings.uiTheme ?? 'system') === value
                    ? 'bg-figma-blue border-figma-blue text-figma-onbrand'
                    : 'bg-figma-surface border-figma-border text-figma-text hover:bg-figma-bg-hover'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="py-2">
          <div className="text-xs text-figma-text font-medium">Color value format</div>
          <div className="text-[10px] text-figma-text-secondary mt-0.5 mb-2">
            Format for displaying resolved and hard-coded colors.
          </div>
          <select
            value={settings.colorDisplayFormat}
            onChange={(e) =>
              onSettingChange(
                'colorDisplayFormat',
                (e.target as HTMLSelectElement).value as ColorDisplayFormat
              )
            }
            className="w-full h-8 px-3 rounded-md border border-figma-border bg-figma-surface text-figma-text text-xs focus:outline-none focus:border-figma-blue/50"
          >
            <option value="hex">Hex</option>
            <option value="rgba">RGBA</option>
            <option value="hsla">HSLA</option>
            <option value="hsba">HSBA</option>
          </select>
        </div>
      </SettingsSection>
    </div>
  );
}
