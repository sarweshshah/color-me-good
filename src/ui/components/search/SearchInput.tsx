import { X, Search } from 'lucide-preact';

interface SearchInputProps {
  value: string;
  onChange: (text: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="flex-1 flex items-center gap-2 min-h-8 min-w-0 bg-figma-surface rounded-md border border-figma-border focus-within:border-figma-blue/50 transition-colors">
      <Search size={14} className="ml-3 text-figma-icon shrink-0" />
      <input
        type="text"
        value={value}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        placeholder="Search hex, token…"
        className="flex-1 min-w-0 h-8 bg-transparent text-figma-text text-xs leading-8 pr-2 focus:outline-none placeholder:text-figma-text-secondary/70"
      />
      {value.length > 0 && (
        <button
          onClick={() => onChange('')}
          className="mr-2 p-0.5 rounded text-figma-text-secondary/70 hover:text-figma-text hover:bg-figma-border/40 transition-colors"
          aria-label="Clear search"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
