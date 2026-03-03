import logoSrc from '../../../assets/logo.png';

const PLUGIN_NAME = 'Color Me Good';
const VERSION = '1.0.0';
const HELP_URL = 'https://github.com/sarweshshah/color-me-good#readme';
const CHANGELOG_URL =
  'https://github.com/sarweshshah/color-me-good/blob/master/CHANGELOG.md';

export function About() {
  return (
    <div className="flex-1 overflow-auto bg-figma-surface px-4 py-4">
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

      <div className="flex items-center gap-1 pt-1 pb-2">
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
    </div>
  );
}
