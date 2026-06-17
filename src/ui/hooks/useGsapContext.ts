import { useLayoutEffect } from 'preact/hooks';
import { RefObject } from 'preact';
import { gsap } from 'gsap';

export function useGsapContext(
  setup: (scope: HTMLElement) => void,
  deps: unknown[],
  scopeRef: RefObject<HTMLElement>
) {
  useLayoutEffect(() => {
    const el = scopeRef.current;
    if (!el) return;
    const ctx = gsap.context(() => setup(el), el);
    return () => ctx.revert();
  }, deps);
}
