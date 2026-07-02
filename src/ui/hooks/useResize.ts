import { useRef, useCallback } from 'preact/hooks';
import { RESIZE_BOUNDS } from '../../shared/constants';
import type { UIMessage } from '../../shared/messages';

export type ResizeMode = 'corner' | 'right' | 'bottom';

export function useResize(postMessage: (msg: UIMessage) => void, mode: ResizeMode) {
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ w: 0, h: 0 });

  const onPointerDown = useCallback((e: PointerEvent) => {
    dragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = {
      w: window.innerWidth,
      h: window.innerHeight,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      let newW = startSize.current.w;
      let newH = startSize.current.h;
      if (mode === 'corner' || mode === 'right')
        newW = Math.max(
          RESIZE_BOUNDS.minWidth,
          Math.min(RESIZE_BOUNDS.maxWidth, startSize.current.w + dx)
        );
      if (mode === 'corner' || mode === 'bottom')
        newH = Math.max(
          RESIZE_BOUNDS.minHeight,
          Math.min(RESIZE_BOUNDS.maxHeight, startSize.current.h + dy)
        );
      postMessage({ type: 'resize', width: Math.round(newW), height: Math.round(newH) });
    },
    [postMessage, mode]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}
