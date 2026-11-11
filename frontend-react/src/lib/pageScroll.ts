/**
 * Page scroll helper
 * Sets data-scrolling on <html> while scrolling (clears after ~800ms)
 * Sets --scroll-progress custom property (0 to 1, rAF-throttled)
 * Sets data-scrolled when window.scrollY > 8 for progressive top bar blur
 */

export function initPageScrollHelper(): () => void {
  if (typeof window === 'undefined') return () => {};

  let clearScrollTimeout: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;

  const updateScroll = () => {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(Math.max(scrollY / maxScroll, 0), 1) : 0;

    document.documentElement.style.setProperty('--scroll-progress', progress.toFixed(4));

    if (scrollY > 8) {
      document.documentElement.setAttribute('data-scrolled', 'true');
    } else {
      document.documentElement.removeAttribute('data-scrolled');
    }
  };

  const onScroll = () => {
    document.documentElement.setAttribute('data-scrolling', 'true');

    if (clearScrollTimeout) clearTimeout(clearScrollTimeout);
    clearScrollTimeout = setTimeout(() => {
      document.documentElement.removeAttribute('data-scrolling');
    }, 800);

    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateScroll);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Initial calculation
  updateScroll();

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (clearScrollTimeout) clearTimeout(clearScrollTimeout);
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}
