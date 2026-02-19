export function Footer() {
  return (
    <footer className="bg-figma-surface border-t border-figma-border px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          className="text-xs text-figma-text-secondary hover:text-figma-blue transition-colors"
          onClick={() => {
            window.open('https://github.com/sarweshshah/color-inspector#readme', '_blank');
          }}
        >
          Help
        </button>
      </div>
      <span className="text-xs text-figma-text-secondary">v1.0.0</span>
    </footer>
  );
}
