import { useRef, useEffect } from 'preact/hooks';
import { gsap } from 'gsap';
import { DURATION, EASE } from '../../utils/motion';

export interface SummaryStatProps {
  className?: string;
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}

export function SummaryStat({
  className = '',
  label,
  value,
  active = false,
  onClick,
}: SummaryStatProps) {
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

  const interactive = Boolean(onClick);

  const content = (
    <div className="flex items-center gap-1">
      <span
        className={`font-mono text-[10px] uppercase tracking-wider ${
          active
            ? 'text-figma-blue'
            : interactive
              ? 'text-figma-text-secondary'
              : 'text-figma-text-tertiary'
        }`}
      >
        {label}
      </span>
      <span
        ref={valueRef}
        className={`tabular-nums ${
          active
            ? 'font-semibold text-figma-blue'
            : interactive
              ? 'font-semibold text-figma-text'
              : 'font-medium text-figma-text-secondary'
        }`}
      >
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
