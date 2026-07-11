import { SerializedColorEntry } from '../../shared/types';
import type { BindingFilter } from '../types/filters';
import { SummaryStat } from './ui/SummaryStat';

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
    <div className="summary-strip">
      <div
        className="summary-strip-scroll flex items-stretch text-xs h-8"
        role="region"
        aria-label="Color summary"
      >
        <SummaryStat
          className="summary-stat shrink-0"
          label="Colors"
          value={colors.length}
          active={bindingFilter === 'all'}
          onClick={() => onBindingFilterChange('all')}
        />
        <SummaryStat
          className="summary-stat shrink-0"
          label="Tokens"
          value={tokenBound}
          active={bindingFilter === 'token-bound'}
          onClick={() => onBindingFilterChange('token-bound')}
        />
        <SummaryStat
          className="summary-stat shrink-0"
          label="Hard-coded"
          value={hardCoded}
          active={bindingFilter === 'hard-coded'}
          onClick={() => onBindingFilterChange('hard-coded')}
        />
        <SummaryStat className="summary-stat shrink-0" label="Elements" value={totalElements} />
      </div>
    </div>
  );
}
