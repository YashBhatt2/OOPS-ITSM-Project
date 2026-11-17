import React, { useEffect, useState, useRef } from 'react';
import clsx from 'clsx';
import styles from './PageBottomFade.module.css';

export interface PageBottomFadeProps {
  className?: string;
  hide?: boolean;
}

export const PageBottomFade: React.FC<PageBottomFadeProps> = ({ className, hide = false }) => {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (hide || typeof window === 'undefined') return;

    const checkHeightAndPosition = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const innerHeight = window.innerHeight;
      const scrollY = window.scrollY;

      const isTallEnough = scrollHeight >= innerHeight + 80;
      const notAtEnd = scrollHeight - (scrollY + innerHeight) > 24;

      setVisible(isTallEnough && notAtEnd);
    };

    window.addEventListener('scroll', checkHeightAndPosition, { passive: true });
    window.addEventListener('resize', checkHeightAndPosition, { passive: true });

    checkHeightAndPosition();

    return () => {
      window.removeEventListener('scroll', checkHeightAndPosition);
      window.removeEventListener('resize', checkHeightAndPosition);
    };
  }, [hide]);

  if (hide) return null;

  return (
    <>
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className={clsx(styles.bottomFade, visible && styles.visible, className)}
      />
    </>
  );
};

