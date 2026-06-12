import { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { gsap } from 'gsap';
import { useGsapContext } from '../hooks/useGsapContext';
import { DURATION, EASE, tweenVars } from '../utils/motion';

interface ViewPanelProps {
  children: ComponentChildren;
  className?: string;
}

export function ViewPanel({ children, className = '' }: ViewPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGsapContext(
    () => {
      gsap.from(ref.current, tweenVars({
        autoAlpha: 0,
        x: 16,
        duration: DURATION.normal,
        ease: EASE.out,
      }));
    },
    [],
    ref
  );

  return (
    <div ref={ref} className={className} style={{ visibility: 'hidden' }}>
      {children}
    </div>
  );
}
