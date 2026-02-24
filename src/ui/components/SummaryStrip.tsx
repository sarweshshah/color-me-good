import { SerializedColorEntry } from '../../shared/types';
import type { BindingFilter } from './SearchFilterBar';

interface SummaryStripProps {
  colors: SerializedColorEntry[];
  bindingFilter: BindingFilter;
  onBindingFilterChange: (filter: BindingFilter) => void;
}

export function SummaryStrip({
  colors,
  bindingFilter,
  onBindingFilterChange,
}: SummaryStripProps) {
  const tokenBound = colors.filter((c) => c.isTokenBound).length;
  const hardCoded = colors.filter((c) => !c.isTokenBound).length;
  const totalElements = colors.reduce((sum, c) => sum + c.usageCount, 0);

  return (
    <div className="bg-figma-bg px-4 py-3 border-b border-figma-border">
      <div className="flex items-center gap-4 text-xs">
        <Stat
          label="Colors"
          value={colors.length}
          active={bindingFilter === 'all'}
          onClick={() => onBindingFilterChange('all')}
        />
        <Stat
          label="Token-bound"
          value={tokenBound}
          active={bindingFilter === 'token-bound'}
          onClick={() => onBindingFilterChange('token-bound')}
        />
        <Stat
          label="Hard-coded"
          value={hardCoded}
          active={bindingFilter === 'hard-coded'}
          onClick={() => onBindingFilterChange('hard-coded')}
        />
        <Stat label="Elements" value={totalElements} />
      </div>
    </div>
  );
}

interface StatProps {
  label: string;
  value: number;
  color?: string;
  active?: boolean;
  onClick?: () => void;
}

function Stat({
  label,
  value,
  color = 'text-figma-text',
  active = false,
  onClick,
}: StatProps) {
  const content = (
    <div className="flex items-center gap-1">
      <span className="text-figma-text-secondary">{label}:</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors ${
          active ? 'bg-figma-blue/10' : 'hover:bg-figma-border/40 cursor-pointer'
        }`}
      >
        {content}
      </button>
    );
  }

  return content;
}
