import { useState, useEffect, RefObject } from 'react';

export type ScrollAxis = 'vertical' | 'horizontal';

export interface ScrollEdgesState {
  moreBefore: boolean;
  moreAfter: boolean;
}

/**
 * useScrollEdges
 * Returns booleans for "more before" and "more after", computed from scroll position
 * with requestAnimationFrame throttling plus a ResizeObserver, with a tolerance of 2 px.
 */
export function useScrollEdges(
  ref: RefObject<HTMLElement | null>,
  axis: ScrollAxis = 'vertical'
): ScrollEdgesState {
  const [edges, setEdges] = useState<ScrollEdgesState>({
    moreBefore: false,
    moreAfter: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId: number | null = null;

    const checkEdges = () => {
      if (!el) return;
      if (axis === 'vertical') {
        const scrollTop = el.scrollTop;
        const scrollHeight = el.scrollHeight;
        const clientHeight = el.clientHeight;

        const moreBefore = scrollTop > 2;
        const moreAfter = scrollHeight - (scrollTop + clientHeight) > 2;

        setEdges((prev) => {
          if (prev.moreBefore === moreBefore && prev.moreAfter === moreAfter) return prev;
          return { moreBefore, moreAfter };
        });
      } else {
        const scrollLeft = el.scrollLeft;
        const scrollWidth = el.scrollWidth;
        const clientWidth = el.clientWidth;

        const moreBefore = scrollLeft > 2;
        const moreAfter = scrollWidth - (scrollLeft + clientWidth) > 2;

        setEdges((prev) => {
          if (prev.moreBefore === moreBefore && prev.moreAfter === moreAfter) return prev;
          return { moreBefore, moreAfter };
        });
      }
    };

    const onScroll = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(checkEdges);
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    // Initial check and on resize
    checkEdges();

    const resizeObserver = new ResizeObserver(() => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(checkEdges);
    });

    resizeObserver.observe(el);
    if (el.firstElementChild) {
      resizeObserver.observe(el.firstElementChild);
    }

    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [ref, axis]);

  return edges;
}

