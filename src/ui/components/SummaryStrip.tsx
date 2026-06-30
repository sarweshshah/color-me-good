import { useRef, useEffect } from 'preact/hooks';
import { gsap } from 'gsap';
import { SerializedColorEntry } from '../../shared/types';
import type { BindingFilter } from './SearchFilterBar';
import { useGsapContext } from '../hooks/useGsapContext';
import { animateFromInScope, DURATION, EASE } from '../utils/motion';

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
  const rowRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useGsapContext(
    (scope) => {
      animateFromInScope(scope, '.summary-stat', {
        autoAlpha: 0,
        y: 6,
        duration: DURATION.normal,
        stagger: 0.06,
        ease: EASE.out,
      });
    },
    [],
    stripRef
  );

  return (
    <div ref={stripRef} className="bg-figma-bg border-b border-figma-border-strong">
      <div
        ref={rowRef}
        className="summary-strip-scroll flex items-stretch text-xs h-8"
        role="region"
        aria-label="Color summary"
      >
        <Stat
          className="summary-stat shrink-0"
          label="Colors"
          value={colors.length}
          active={bindingFilter === 'all'}
          onClick={() => onBindingFilterChange('all')}
        />
        <Stat
          className="summary-stat shrink-0"
          label="Tokens"
          value={tokenBound}
          active={bindingFilter === 'token-bound'}
          onClick={() => onBindingFilterChange('token-bound')}
        />
        <Stat
          className="summary-stat shrink-0"
          label="Hard-coded"
          value={hardCoded}
          active={bindingFilter === 'hard-coded'}
          onClick={() => onBindingFilterChange('hard-coded')}
        />
        <Stat className="summary-stat shrink-0" label="Elements" value={totalElements} />
      </div>
    </div>
  );
}

interface StatProps {
  className?: string;
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}

function Stat({ className = '', label, value, active = false, onClick }: StatProps) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    const el = valueRef.current;
    if (!el || prevValue.current === value) return;

    const from = prevValue.current;
    prevValue.current = value;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      el.textContent = String(value);
      return;
    }

    const proxy = { val: from };
    gsap.to(proxy, {
      val: value,
      duration: DURATION.normal,
      ease: EASE.out,
      onUpdate: () => {
        el.textContent = String(Math.round(proxy.val));
      },
      onComplete: () => {
        el.textContent = String(value);
      },
    });
  }, [value]);

  const content = (
    <div className="flex items-center gap-1">
      <span className={active ? 'text-figma-text' : 'text-figma-text-secondary'}>
        {label}:
      </span>
      <span ref={valueRef} className="font-semibold text-figma-text tabular-nums">
        {value}
      </span>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} flex items-center px-3 transition-colors ${
          active
            ? 'summary-strip-stat-active bg-figma-bg-selected text-figma-text'
            : 'hover:bg-figma-border/40 cursor-pointer'
        }`}
      >
        {content}
      </button>
    );
  }

  return <div className={`${className} flex items-center px-3`}>{content}</div>;
}
