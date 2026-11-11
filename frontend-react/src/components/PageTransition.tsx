import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      document.documentElement.getAttribute('data-reduced-motion') === 'true' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  });

  useEffect(() => {
    const checkMotion = () => {
      setReduced(
        document.documentElement.getAttribute('data-reduced-motion') === 'true' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    };
    const observer = new MutationObserver(checkMotion);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-reduced-motion'] });
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', checkMotion);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', checkMotion);
    };
  }, []);

  if (reduced) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', width: '100%' }}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        width: '100%',
      }}
    >
      {children}
    </motion.div>
  );
};
