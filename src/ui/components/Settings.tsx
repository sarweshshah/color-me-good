import { PluginSettings, ColorDisplayFormat } from '../../shared/messages';

interface SettingsProps {
  settings: PluginSettings | null;
  onSettingChange: <K extends keyof PluginSettings>(
    key: K,
    value: PluginSettings[K]
  ) => void;
}

function SettingRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
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

function Section({
  title,
  children,
}: {
  title: string;
  children: preact.ComponentChildren;
}) {
  return (
    <section className="border-b border-figma-border last:border-b-0">
      <h2 className="text-[10px] font-medium text-figma-text-secondary uppercase tracking-wider px-4 pt-4 pb-2">
        {title}
      </h2>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
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
      <Section title="Scan">
        <SettingRow
          label="Include vectors"
          description="Include vector nodes (e.g. shapes, paths) in the scan."
          checked={settings.includeVectors}
          onChange={(v) => onSettingChange('includeVectors', v)}
        />
        <SettingRow
          label="Include hidden layers"
          description="Include hidden (invisible) layers in the scan results."
          checked={settings.includeHiddenLayers}
          onChange={(v) => onSettingChange('includeHiddenLayers', v)}
        />
      </Section>

      <Section title="Behavior">
        <SettingRow
          label="Smooth zoom"
          description="Animate viewport when zooming to an element."
          checked={settings.smoothZoom}
          onChange={(v) => onSettingChange('smoothZoom', v)}
        />
      </Section>

      <Section title="Display">
        <div className="py-2">
          <div className="text-xs text-figma-text font-medium">
            UI theme
          </div>
          <div className="text-[10px] text-figma-text-secondary mt-0.5 mb-2">
            Choose light, dark, or follow system preference.
          </div>
          <div className="flex gap-2 mb-4">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => onSettingChange('uiTheme', theme)}
                className={`flex-1 px-3 py-2 rounded-md border text-xs font-medium capitalize transition-colors ${
                  (settings.uiTheme ?? 'system') === theme
                    ? 'bg-figma-blue border-figma-blue text-figma-onbrand'
                    : 'bg-figma-surface border-figma-border text-figma-text hover:bg-figma-bg-hover'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
        <div className="py-2">
          <div className="text-xs text-figma-text font-medium">
            Color value format
          </div>
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
      </Section>

    </div>
  );
}
