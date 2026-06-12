import { useRef } from 'preact/hooks';
import { gsap } from 'gsap';
import { useGsapContext } from '../hooks/useGsapContext';
import { DURATION, EASE, tweenVars } from '../utils/motion';

interface ScanningStateProps {
  scanned: number;
  total: number;
  onCancel: () => void;
}

export function ScanningState({ scanned, total, onCancel }: ScanningStateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTotal = total > 0;
  const percent = hasTotal ? Math.min(100, (scanned / total) * 100) : 0;

  useGsapContext(
    () => {
      gsap.from(containerRef.current, tweenVars({
        autoAlpha: 0,
        y: 8,
        duration: DURATION.normal,
        ease: EASE.out,
      }));
    },
    [],
    containerRef
  );

  return (
    <div ref={containerRef} className="text-center" style={{ visibility: 'hidden' }}>
      <div className="text-figma-text text-sm mb-2">Scanning...</div>
      <div className="text-figma-text-secondary text-xs min-h-[1rem]">
        {hasTotal ? (
          <>
            {scanned.toLocaleString()} / {total.toLocaleString()} nodes
          </>
        ) : (
          'Counting nodes…'
        )}
      </div>
      <div className="w-48 h-1 bg-figma-border rounded-full overflow-hidden mt-3 mx-auto">
        <div
          className={`h-full w-full bg-figma-blue origin-left ${
            hasTotal ? 'transition-[transform] duration-300 ease-out' : 'scanning-indeterminate'
          }`}
          style={hasTotal ? { transform: `scaleX(${percent / 100})` } : undefined}
        />
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="mt-4 px-3 py-1.5 text-xs text-figma-text-secondary border border-figma-border rounded hover:bg-figma-bg-hover hover:text-figma-text active:bg-figma-border transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
