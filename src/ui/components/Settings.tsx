import { PluginSettings } from '../../shared/messages';
import logoSrc from '../../../assets/logo.png';

const PLUGIN_NAME = 'Color Me Good';
const VERSION = '1.0.0';
const HELP_URL = 'https://github.com/sarweshshah/color-me-good#readme';
const CHANGELOG_URL = 'https://github.com/sarweshshah/color-me-good/blob/master/CHANGELOG.md';

interface SettingsProps {
  settings: PluginSettings | null;
  onSettingChange: (key: keyof PluginSettings, value: boolean) => void;
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
        <div className="text-sm text-figma-text font-medium">{label}</div>
        {description && (
          <div className="text-xs text-figma-text-secondary mt-0.5">{description}</div>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`shrink-0 w-9 h-5 rounded-full transition-colors flex items-center ${
          checked ? 'bg-figma-blue' : 'bg-figma-border'
        }`}
      >
        <span
          className="block w-4 h-4 rounded-full bg-figma-onbrand shadow-sm transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
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
      <div className="flex-1 flex items-center justify-center p-6">
        <span className="text-figma-text-secondary text-sm">Loading settings…</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Section title="Scan">
        <SettingRow
          label="Include vectors"
          description="Include vector nodes (e.g. shapes, paths) in the scan."
          checked={settings.includeVectors}
          onChange={(v) => onSettingChange('includeVectors', v)}
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

      <Section title="About">
        <div className="flex items-center gap-3 py-3">
          <img
            src={logoSrc}
            alt=""
            className="w-10 h-10 rounded-lg shrink-0"
            aria-hidden
          />
          <div className="min-w-0">
            <div className="text-sm font-medium text-figma-text">{PLUGIN_NAME}</div>
            <div className="text-xs text-figma-text-secondary">v{VERSION}</div>
          </div>
        </div>

        <div className="space-y-0.5 pt-1 pb-2">
          <div className="text-xs text-figma-text-secondary">
            Created by <span className="text-figma-text font-medium">Sarwesh Shah</span>
          </div>
          <div className="text-xs text-figma-text-secondary">
            Logo inspired by{' '}
            <span className="text-figma-text font-medium">Ashwini Wath</span>
          </div>
          <div className="pt-2 text-xs text-figma-text-secondary">
            ♥️ Made in India 2026
          </div>
        </div>

        <div className="flex items-center gap-1 pb-2">
          <a
            href={HELP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-figma-blue hover:underline"
            onClick={(e) => {
              e.preventDefault();
              window.open(HELP_URL, '_blank');
            }}
          >
            Help
          </a>
          <span className="text-figma-border">·</span>
          <a
            href={CHANGELOG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-figma-blue hover:underline"
            onClick={(e) => {
              e.preventDefault();
              window.open(CHANGELOG_URL, '_blank');
            }}
          >
            Change Log
          </a>
        </div>
      </Section>
    </div>
  );
}
