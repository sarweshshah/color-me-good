import { useEffect } from 'preact/hooks';
import { RefObject } from 'preact';
import { gsap } from 'gsap';

export function useGsapContext(
  setup: () => void,
  deps: unknown[],
  scopeRef: RefObject<HTMLElement>
) {
  useEffect(() => {
    const el = scopeRef.current;
    if (!el) return;
    const ctx = gsap.context(setup, el);
    return () => ctx.revert();
  }, deps);
}
