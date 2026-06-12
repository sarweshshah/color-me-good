import { gsap } from 'gsap';

export const DURATION = {
  faster: 0.12,
  fast: 0.2,
  normal: 0.35,
  slow: 0.5,
} as const;

/** Pause list entrance until the top header chrome has settled. */
export const DELAY = {
  afterHeader: 0.3,
} as const;

export const EASE = {
  out: 'power2.out',
  inOut: 'power2.inOut',
  bounce: 'back.out(1.4)',
} as const;

export function shouldAnimate(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function tweenVars(vars: gsap.TweenVars): gsap.TweenVars {
  if (!shouldAnimate()) {
    return { ...vars, duration: 0, delay: 0, stagger: 0 };
  }
  return vars;
}

export function pulseScale(target: Element | null) {
  if (!target || !shouldAnimate()) return;
  gsap.fromTo(
    target,
    { scale: 1 },
    { scale: 1.18, duration: DURATION.fast, yoyo: true, repeat: 1, ease: EASE.bounce }
  );
}
