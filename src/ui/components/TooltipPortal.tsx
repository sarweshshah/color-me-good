import { useState, useEffect, useLayoutEffect, useRef } from 'preact/hooks';

const TOOLTIP_Z_INDEX = 10003;
const OFFSET_PX = 4;
const VIEWPORT_PADDING = 12;

function getTooltipPosition(
  rect: DOMRect,
  position: 'above' | 'below',
  align: 'start' | 'center' | 'end'
): { top: number; left: number; transform: string } {
  const transform: string[] = [];
  let left = 0;
  let top = 0;

  if (position === 'above') {
    top = rect.top - OFFSET_PX;
    transform.push('translateY(-100%)');
  } else {
    top = rect.bottom + OFFSET_PX;
  }

  switch (align) {
    case 'start':
      left = rect.left;
      break;
    case 'end':
      left = rect.right;
      transform.push('translateX(-100%)');
      break;
    default:
      left = rect.left + rect.width / 2;
      transform.push('translateX(-50%)');
      break;
  }

  return { top, left, transform: transform.join(' ') || 'none' };
}

export function TooltipPortal() {
  const [trigger, setTrigger] = useState<Element | null>(null);
  const [content, setContent] = useState<string>('');
  const [style, setStyle] = useState<{ top: number; left: number; transform: string } | null>(null);
  const [clampedStyle, setClampedStyle] = useState<{ left: number; transform: string } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const app = document.getElementById('app');
    app?.classList.add('use-tooltip-portal');
    return () => {
      app?.classList.remove('use-tooltip-portal');
    };
  }, []);

  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const el = (e.target as Element).closest?.('[data-tooltip]') as HTMLElement | null;
      if (el) {
        const text = el.getAttribute('data-tooltip');
        if (text == null || text === '') return;
        setTrigger(el);
        setContent(text);
      }
    };

    const onOut = (e: MouseEvent) => {
      const from = (e.target as Element).closest?.('[data-tooltip]');
      const to = (e.relatedTarget as Element)?.closest?.('[data-tooltip]');
      if (from && !to) setTrigger(null);
    };

    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    return () => {
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
    };
  }, []);

  useEffect(() => {
    if (!trigger) {
      setStyle(null);
      return;
    }

    const update = () => {
      if (!trigger.isConnected) {
        setTrigger(null);
        return;
      }
      const position = (trigger.getAttribute('data-tooltip-position') || 'above') as 'above' | 'below';
      const align = (trigger.getAttribute('data-tooltip-align') || 'center') as 'start' | 'center' | 'end';
      const rect = trigger.getBoundingClientRect();
      setStyle(getTooltipPosition(rect, position, align));
      setClampedStyle(null);
    };

    update();
    const raf = requestAnimationFrame(update);
    const interval = setInterval(update, 100);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
    };
  }, [trigger]);

  useLayoutEffect(() => {
    if (!style || !tooltipRef.current) return;
    const el = tooltipRef.current;
    const rect = el.getBoundingClientRect();
    const app = document.getElementById('app');
    const panel = app?.getBoundingClientRect();
    const minLeft = panel ? panel.left + VIEWPORT_PADDING : VIEWPORT_PADDING;
    const maxRight = panel ? panel.right - VIEWPORT_PADDING : window.innerWidth - VIEWPORT_PADDING;
    const leftEdge = rect.left;
    const rightEdge = rect.right;
    if (leftEdge >= minLeft && rightEdge <= maxRight) return;
    const width = rect.width;
    const hasTranslateY = style.transform.includes('translateY(-100%)');
    let left: number;
    let transform: string;
    if (leftEdge < minLeft && rightEdge > maxRight) {
      left = minLeft;
      transform = hasTranslateY ? 'translateY(-100%)' : 'none';
    } else if (leftEdge < minLeft) {
      left = minLeft;
      transform = hasTranslateY ? 'translateY(-100%)' : 'none';
    } else {
      left = maxRight - width;
      transform = hasTranslateY ? 'translateX(-100%) translateY(-100%)' : 'translateX(-100%)';
    }
    setClampedStyle({ left, transform });
  }, [style, trigger, content]);

  if (!trigger || !style || !content) return null;

  const displayStyle = clampedStyle ? { ...style, ...clampedStyle } : style;

  return (
    <div
      ref={tooltipRef}
      className="fixed pointer-events-none"
      style={{
        zIndex: TOOLTIP_Z_INDEX,
        top: displayStyle.top,
        left: displayStyle.left,
        transform: displayStyle.transform,
        padding: '3px 8px',
        borderRadius: '4px',
        background: 'var(--figma-color-bg-inverse, #333)',
        color: 'var(--figma-color-text-oninverse, #fff)',
        fontSize: '11px',
        lineHeight: 1.4,
        whiteSpace: 'pre-line',
        maxWidth: 'min(280px, calc(100vw - 24px))',
        width: 'max-content',
        boxSizing: 'border-box',
      }}
      role="tooltip"
    >
      {content}
    </div>
  );
}
