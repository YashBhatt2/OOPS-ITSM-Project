import React from 'react';
import clsx from 'clsx';
import styles from './ScrollEdge.module.css';

export type ScrollEdgeMode = 'fade' | 'blur';
export type ScrollEdgeSide = 'top' | 'bottom' | 'left' | 'right';

export interface ScrollEdgeProps {
  side: ScrollEdgeSide;
  visible: boolean;
  mode?: ScrollEdgeMode;
  className?: string;
}

export const ScrollEdge: React.FC<ScrollEdgeProps> = ({
  side,
  visible,
  mode = 'fade',
  className,
}) => {
  const isVertical = side === 'top' || side === 'bottom';

  return (
    <div
      aria-hidden="true"
      className={clsx(
        styles.cueContainer,
        side === 'top' && styles.verticalTop,
        side === 'bottom' && styles.verticalBottom,
        side === 'left' && styles.horizontalLeft,
        side === 'right' && styles.horizontalRight,
        visible ? styles.visible : styles.hidden,
        mode === 'fade' && (
          side === 'top' ? styles.fadeTop :
          side === 'bottom' ? styles.fadeBottom :
          side === 'left' ? styles.fadeLeft :
          styles.fadeRight
        ),
        className
      )}
    >
      {mode === 'blur' && isVertical && (
        <>
          <div className={clsx(styles.blurLayer, side === 'top' ? styles.blurTop1 : styles.blurBottom1)} />
          <div className={clsx(styles.blurLayer, side === 'top' ? styles.blurTop2 : styles.blurBottom2)} />
          <div className={clsx(styles.blurLayer, side === 'top' ? styles.blurTop3 : styles.blurBottom3)} />
          <div className={clsx(styles.blurLayer, side === 'top' ? styles.blurTop4 : styles.blurBottom4)} />
          {/* Subtle gradient wash to complete the ramp */}
          <div className={clsx(styles.blurLayer, side === 'top' ? styles.fadeTop : styles.fadeBottom)} style={{ opacity: 0.6 }} />
        </>
      )}
    </div>
  );
};

