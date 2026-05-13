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

    let rafId: number | null = null;

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

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    };

    update();

    const scrollContainer = document.querySelector('.overflow-auto');
    scrollContainer?.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      scrollContainer?.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [trigger]);

  useLayoutEffect(() => {
    if (!style || !tooltipRef.current || !trigger) return;
    const tooltipEl = tooltipRef.current;
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const app = document.getElementById('app');
    const panel = app?.getBoundingClientRect();
    const minLeft = panel ? panel.left + VIEWPORT_PADDING : VIEWPORT_PADDING;
    const maxRight = panel ? panel.right - VIEWPORT_PADDING : window.innerWidth - VIEWPORT_PADDING;
    const leftEdge = tooltipRect.left;
    const rightEdge = tooltipRect.right;

    if (leftEdge >= minLeft && rightEdge <= maxRight) {
      setClampedStyle(null);
      return;
    }

    const width = tooltipRect.width;
    const position = (trigger.getAttribute('data-tooltip-position') || 'above') as 'above' | 'below';
    const align = (trigger.getAttribute('data-tooltip-align') || 'center') as 'start' | 'center' | 'end';
    const triggerRect = trigger.getBoundingClientRect();
    const transforms: string[] = [];
    if (position === 'above') transforms.push('translateY(-100%)');

    let left = style.left;

    if (align === 'end') {
      transforms.push('translateX(-100%)');
      left = triggerRect.right;
      if (left - width < minLeft) {
        left = minLeft + width;
      }
      if (left > maxRight) {
        left = maxRight;
      }
    } else if (align === 'start') {
      left = triggerRect.left;
      if (left < minLeft) left = minLeft;
      if (left + width > maxRight) left = maxRight - width;
    } else {
      transforms.push('translateX(-50%)');
      left = triggerRect.left + triggerRect.width / 2;
      const half = width / 2;
      if (left - half < minLeft) left = minLeft + half;
      if (left + half > maxRight) left = maxRight - half;
    }

    setClampedStyle({ left, transform: transforms.join(' ') || 'none' });
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
