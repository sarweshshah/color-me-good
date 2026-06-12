import { useRef } from 'preact/hooks';
import { gsap } from 'gsap';
import { useGsapContext } from '../hooks/useGsapContext';
import { DURATION, EASE, tweenVars } from '../utils/motion';
import { MousePointerClick } from 'lucide-preact';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGsapContext(
    () => {
      gsap.from('.empty-state-icon', tweenVars({
        autoAlpha: 0,
        scale: 0.85,
        duration: DURATION.slow,
        ease: EASE.bounce,
      }));
      gsap.from('.empty-state-copy', tweenVars({
        autoAlpha: 0,
        y: 10,
        duration: DURATION.normal,
        ease: EASE.out,
        stagger: 0.08,
        delay: 0.12,
      }));
      gsap.to('.empty-state-icon', tweenVars({
        y: -4,
        duration: 1.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.5,
      }));
    },
    [],
    ref
  );

  return (
    <div ref={ref} className="text-center px-6 max-w-[320px]">
      <div
        className="empty-state-icon flex justify-center mb-2 text-figma-text-tertiary non-scanned-state-icon"
        style={{ visibility: 'hidden' }}
      >
        <MousePointerClick size={48} strokeWidth={1.5} className="text-figma-text-tertiary" />
      </div>
      <div className="empty-state-copy text-figma-text text-sm font-medium mb-1" style={{ visibility: 'hidden' }}>
        {title}
      </div>
      <div className="empty-state-copy text-figma-text-secondary text-xs leading-snug" style={{ visibility: 'hidden' }}>
        {description}
      </div>
    </div>
  );
}
