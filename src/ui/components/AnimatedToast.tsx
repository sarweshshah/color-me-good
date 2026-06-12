import { useRef } from 'preact/hooks';
import type { RefObject } from 'preact';
import { gsap } from 'gsap';
import { useGsapContext } from '../hooks/useGsapContext';
import { DURATION, EASE, tweenVars } from '../utils/motion';

interface AnimatedToastProps {
  message: string;
  footerRef: RefObject<HTMLElement>;
}

export function AnimatedToast({ message, footerRef }: AnimatedToastProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGsapContext(
    () => {
      const el = ref.current;
      const footer = footerRef.current;
      if (!el || !footer) return;

      const footerHeight = footer.offsetHeight;
      gsap.fromTo(
        el,
        { y: footerHeight, autoAlpha: 1 },
        tweenVars({
          y: 0,
          autoAlpha: 1,
          duration: DURATION.normal,
          ease: EASE.out,
        })
      );
    },
    [],
    ref
  );

  return (
    <div
      ref={ref}
      className="absolute inset-x-0 bottom-full z-0 h-5 flex items-center justify-center bg-figma-green text-figma-onsuccess text-[11px] font-medium px-4 pointer-events-none"
      role="status"
      aria-live="polite"
      style={{ visibility: 'hidden' }}
    >
      {message}
    </div>
  );
}
