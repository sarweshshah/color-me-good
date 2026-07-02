import type { UIMessage } from '../../shared/messages';
import { useResize } from '../hooks/useResize';

interface ResizeHandlesProps {
  postMessage: (msg: UIMessage) => void;
}

export function ResizeHandles({ postMessage }: ResizeHandlesProps) {
  const corner = useResize(postMessage, 'corner');
  const right = useResize(postMessage, 'right');
  const bottom = useResize(postMessage, 'bottom');

  const z = { zIndex: 10002 };
  return (
    <>
      <div
        onPointerDown={corner.onPointerDown}
        onPointerMove={corner.onPointerMove}
        onPointerUp={corner.onPointerUp}
        style={{
          position: 'fixed',
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          cursor: 'nwse-resize',
          ...z,
        }}
      />
      <div
        onPointerDown={right.onPointerDown}
        onPointerMove={right.onPointerMove}
        onPointerUp={right.onPointerUp}
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 12,
          width: 4,
          cursor: 'ew-resize',
          ...z,
        }}
      />
      <div
        onPointerDown={bottom.onPointerDown}
        onPointerMove={bottom.onPointerMove}
        onPointerUp={bottom.onPointerUp}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 12,
          height: 4,
          cursor: 'ns-resize',
          ...z,
        }}
      />
    </>
  );
}
