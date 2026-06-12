import { useRef } from 'preact/hooks';
import { gsap } from 'gsap';
import { useGsapContext } from '../hooks/useGsapContext';
import { DURATION, EASE, tweenVars } from '../utils/motion';

interface AnimatedToastProps {
  message: string;
}

export function AnimatedToast({ message }: AnimatedToastProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGsapContext(
    () => {
      const el = ref.current;
      if (!el) return;
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 12, scale: 0.96 },
        tweenVars({
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: DURATION.normal,
          ease: EASE.bounce,
        })
      );
    },
    [],
    ref
  );

  return (
    <div
      ref={ref}
      className="fixed left-1/2 -translate-x-1/2 bottom-14 z-[10001] bg-figma-green text-figma-onsuccess text-xs font-medium px-4 py-2 rounded shadow-lg"
      role="status"
      aria-live="polite"
      style={{ visibility: 'hidden' }}
    >
      {message}
    </div>
  );
}
