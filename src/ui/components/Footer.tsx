const HELP_URL = 'https://github.com/sarweshshah/color-me-good#readme';
const VERSION = '1.0.0';

interface FooterProps {
  view: 'list' | 'settings';
  onOpenSettings: () => void;
  onBack: () => void;
  onCancel?: () => void;
}

export function Footer({ view, onOpenSettings, onBack, onCancel }: FooterProps) {
  return (
    <footer className="shrink-0 flex-none bg-figma-surface border-t border-figma-border px-4 py-2 flex items-center justify-between">
      {view === 'settings' ? (
        <div className="w-full flex items-center justify-between">
          <button
            className="text-xs text-figma-text-secondary hover:text-figma-blue transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="text-xs text-figma-text-secondary hover:text-figma-blue transition-colors"
            onClick={onBack}
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              className="text-xs text-figma-text-secondary hover:text-figma-blue transition-colors"
              onClick={onOpenSettings}
            >
              Settings
            </button>
            <button
              className="text-xs text-figma-text-secondary hover:text-figma-blue transition-colors"
              onClick={() => window.open(HELP_URL, '_blank')}
            >
              Help
            </button>
          </div>
          <span className="text-xs text-figma-text-secondary">v{VERSION}</span>
        </>
      )}
    </footer>
  );
}
