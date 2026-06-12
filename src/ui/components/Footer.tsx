import { VERSION, HELP_URL } from '../../shared/constants';

interface FooterProps {
  view: 'list' | 'settings' | 'about';
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onBack: () => void;
}

export function Footer({ view, onOpenSettings, onOpenAbout, onBack }: FooterProps) {
  return (
    <footer className="shrink-0 flex-none z-0 bg-figma-bg border-t border-figma-border px-4 py-2 flex items-center justify-between">
      {view === 'settings' || view === 'about' ? (
        <button
          className="text-xs text-figma-text-secondary hover:text-figma-blue transition-colors"
          onClick={onBack}
        >
          Back
        </button>
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
            <button
              className="text-xs text-figma-text-secondary hover:text-figma-blue transition-colors"
              onClick={onOpenAbout}
            >
              About
            </button>
          </div>
          <span className="text-xs text-figma-text-secondary">v{VERSION}</span>
        </>
      )}
    </footer>
  );
}
