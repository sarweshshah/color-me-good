import { useState, useEffect, useLayoutEffect, useRef } from 'preact/hooks';

const TOOLTIP_Z_INDEX = 10003;
const OFFSET_PX = 4;
const VIEWPORT_PADDING = 8;

type TooltipPosition = 'above' | 'below';
type TooltipAlign = 'start' | 'center' | 'end';

interface TooltipStyle {
  top: number;
  left: number;
  transform: string;
  maxWidth: number;
}

function readAttrs(trigger: Element): {
  position: TooltipPosition;
  align: TooltipAlign;
} {
  return {
    position: (trigger.getAttribute('data-tooltip-position') || 'above') as TooltipPosition,
    align: (trigger.getAttribute('data-tooltip-align') || 'center') as TooltipAlign,
  };
}

function getPanelBounds(): { top: number; left: number; right: number; bottom: number } {
  const app = document.getElementById('app');
  const panel = app?.getBoundingClientRect();
  if (panel) {
    return {
      top: panel.top + VIEWPORT_PADDING,
      left: panel.left + VIEWPORT_PADDING,
      right: panel.right - VIEWPORT_PADDING,
      bottom: panel.bottom - VIEWPORT_PADDING,
    };
  }
  return {
    top: VIEWPORT_PADDING,
    left: VIEWPORT_PADDING,
    right: window.innerWidth - VIEWPORT_PADDING,
    bottom: window.innerHeight - VIEWPORT_PADDING,
  };
}

function placeTooltip(
  triggerRect: DOMRect,
  tooltipSize: { width: number; height: number },
  preferredPosition: TooltipPosition,
  align: TooltipAlign
): TooltipStyle {
  const bounds = getPanelBounds();
  const maxWidth = Math.max(80, bounds.right - bounds.left);
  const width = Math.min(tooltipSize.width || 160, maxWidth);
  const height = tooltipSize.height || 24;

  const spaceAbove = triggerRect.top - bounds.top;
  const spaceBelow = bounds.bottom - triggerRect.bottom;

  let position = preferredPosition;
  if (position === 'above' && height + OFFSET_PX > spaceAbove && spaceBelow >= spaceAbove) {
    position = 'below';
  } else if (position === 'below' && height + OFFSET_PX > spaceBelow && spaceAbove > spaceBelow) {
    position = 'above';
  }

  const transforms: string[] = [];
  let top: number;
  if (position === 'above') {
    top = triggerRect.top - OFFSET_PX;
    transforms.push('translateY(-100%)');
    if (top - height < bounds.top) {
      top = bounds.top + height;
    }
  } else {
    top = triggerRect.bottom + OFFSET_PX;
    if (top + height > bounds.bottom) {
      top = Math.max(bounds.top, bounds.bottom - height);
    }
  }

  let left: number;
  if (align === 'start') {
    left = triggerRect.left;
  } else if (align === 'end') {
    left = triggerRect.right;
    transforms.push('translateX(-100%)');
  } else {
    left = triggerRect.left + triggerRect.width / 2;
    transforms.push('translateX(-50%)');
  }

  if (align === 'end') {
    if (left - width < bounds.left) left = bounds.left + width;
    if (left > bounds.right) left = bounds.right;
  } else if (align === 'start') {
    if (left < bounds.left) left = bounds.left;
    if (left + width > bounds.right) left = bounds.right - width;
  } else {
    const half = width / 2;
    if (left - half < bounds.left) left = bounds.left + half;
    if (left + half > bounds.right) left = bounds.right - half;
  }

  return {
    top,
    left,
    transform: transforms.join(' ') || 'none',
    maxWidth,
  };
}

export function TooltipPortal() {
  const [trigger, setTrigger] = useState<Element | null>(null);
  const [content, setContent] = useState<string>('');
  const [style, setStyle] = useState<TooltipStyle | null>(null);
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
        setStyle(null);
      }
    };

    const onOut = (e: MouseEvent) => {
      const from = (e.target as Element).closest?.('[data-tooltip]');
      const to = (e.relatedTarget as Element)?.closest?.('[data-tooltip]');
      if (from && !to) {
        setTrigger(null);
        setContent('');
        setStyle(null);
      }
    };

    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    return () => {
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (!trigger || !content) return;

    const measureAndPlace = () => {
      const el = tooltipRef.current;
      if (!trigger.isConnected || !el) {
        setTrigger(null);
        setStyle(null);
        return;
      }

      const { position, align } = readAttrs(trigger);
      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = el.getBoundingClientRect();
      setStyle(
        placeTooltip(
          triggerRect,
          { width: tooltipRect.width, height: tooltipRect.height },
          position,
          align
        )
      );
    };

    measureAndPlace();
    const rafId = requestAnimationFrame(measureAndPlace);

    const scrollContainers = document.querySelectorAll('.overflow-auto, .overscroll-contain');
    scrollContainers.forEach((node) => {
      node.addEventListener('scroll', measureAndPlace, { passive: true });
    });
    window.addEventListener('resize', measureAndPlace);

    return () => {
      cancelAnimationFrame(rafId);
      scrollContainers.forEach((node) => {
        node.removeEventListener('scroll', measureAndPlace);
      });
      window.removeEventListener('resize', measureAndPlace);
    };
  }, [trigger, content]);

  if (!trigger || !content) return null;

  const bounds = getPanelBounds();
  const fallbackMaxWidth = Math.max(80, bounds.right - bounds.left);

  return (
    <div
      ref={tooltipRef}
      className="fixed pointer-events-none"
      style={{
        zIndex: TOOLTIP_Z_INDEX,
        top: style?.top ?? 0,
        left: style?.left ?? 0,
        transform: style?.transform ?? 'none',
        padding: '3px 8px',
        borderRadius: '4px',
        background: 'var(--figma-color-bg-inverse, #333)',
        color: 'var(--figma-color-text-oninverse, #fff)',
        fontSize: '11px',
        lineHeight: 1.4,
        whiteSpace: 'pre-line',
        maxWidth: style?.maxWidth ?? fallbackMaxWidth,
        width: 'max-content',
        boxSizing: 'border-box',
        visibility: style ? 'visible' : 'hidden',
      }}
      role="tooltip"
    >
      {content}
    </div>
  );
}
