import { ChevronLeft } from 'lucide-preact';

interface PanelHeaderProps {
  title: string;
  onBack: () => void;
}

export function PanelHeader({ title, onBack }: PanelHeaderProps) {
  return (
    <div className="flex items-stretch w-full min-w-0 h-8 bg-figma-bg border-b border-figma-border-subtle">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center shrink-0 w-8 h-full text-figma-text-tertiary hover:text-figma-text transition-colors"
        aria-label="Back"
      >
        <ChevronLeft size={14} strokeWidth={1.75} />
      </button>
      <h1 className="flex items-center font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-figma-text pl-0.5 pr-3">
        {title}
      </h1>
    </div>
  );
}
