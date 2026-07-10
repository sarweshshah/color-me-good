import { X, Search } from 'lucide-preact';

interface SearchInputProps {
  value: string;
  onChange: (text: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="flex-1 flex items-center min-w-0 h-8">
      <span className="flex items-center justify-center shrink-0 w-8 h-full text-figma-text-tertiary">
        <Search size={13} strokeWidth={1.75} />
      </span>
      <input
        type="text"
        value={value}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        placeholder="Search hex, token…"
        className="flex-1 min-w-0 h-full bg-transparent text-figma-text text-xs font-medium leading-none focus:outline-none placeholder:text-figma-text-secondary placeholder:font-normal"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="shrink-0 flex items-center justify-center w-8 h-full text-figma-text-tertiary hover:text-figma-text transition-colors"
          aria-label="Clear search"
        >
          <X size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
