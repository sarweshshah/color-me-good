import { ChevronLeft } from 'lucide-preact';

interface PanelHeaderProps {
  title: string;
  onBack: () => void;
}

export function PanelHeader({ title, onBack }: PanelHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-figma-border flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="p-1 -ml-1 rounded text-figma-text-secondary hover:text-figma-text hover:bg-figma-bg-hover active:bg-figma-border transition-colors"
        aria-label="Back"
      >
        <ChevronLeft size={20} />
      </button>
      <h1 className="text-sm font-semibold text-figma-text">{title}</h1>
    </div>
  );
}
