import React, { useRef } from 'react';
import * as RadixScrollArea from '@radix-ui/react-scroll-area';
import clsx from 'clsx';
import { useScrollEdges } from '@/lib/useScrollEdges';
import { ScrollEdge, ScrollEdgeMode } from '../ScrollEdge/ScrollEdge';
import styles from './ScrollArea.module.css';

export type ScrollAreaType = 'auto' | 'always' | 'scroll' | 'hover';
export type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';

export interface ScrollAreaProps {
  children: React.ReactNode;
  type?: ScrollAreaType;
  orientation?: ScrollAreaOrientation;
  edgeCues?: boolean;
  edgeMode?: ScrollEdgeMode;
  ariaLabel: string;
  className?: string;
  viewportClassName?: string;
  style?: React.CSSProperties;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
  overscrollContain?: boolean;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({
  children,
  type = 'scroll',
  orientation = 'vertical',
  edgeCues = true,
  edgeMode = 'fade',
  ariaLabel,
  className,
  viewportClassName,
  style,
  viewportRef: externalViewportRef,
  overscrollContain = false,
}) => {
  const internalViewportRef = useRef<HTMLDivElement | null>(null);
  const activeViewportRef = externalViewportRef || internalViewportRef;

  const verticalEdges = useScrollEdges(activeViewportRef, 'vertical');
  const horizontalEdges = useScrollEdges(activeViewportRef, 'horizontal');

  const hasVertical = orientation === 'vertical' || orientation === 'both';
  const hasHorizontal = orientation === 'horizontal' || orientation === 'both';

  return (
    <RadixScrollArea.Root
      type={type}
      className={clsx(styles.root, className)}
      style={style}
    >
      <RadixScrollArea.Viewport
        ref={activeViewportRef}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel}
        className={clsx(styles.viewport, viewportClassName)}
        style={{
          overscrollBehavior: overscrollContain ? 'contain' : undefined,
        }}
      >
        {children}
      </RadixScrollArea.Viewport>

      {/* Edge Cues (Rendered only on sides where more content exists) */}
      {edgeCues && hasVertical && (
        <>
          <ScrollEdge side="top" visible={verticalEdges.moreBefore} mode={edgeMode} />
          <ScrollEdge side="bottom" visible={verticalEdges.moreAfter} mode={edgeMode} />
        </>
      )}

      {edgeCues && hasHorizontal && (
        <>
          <ScrollEdge side="left" visible={horizontalEdges.moreBefore} mode={edgeMode} />
          <ScrollEdge side="right" visible={horizontalEdges.moreAfter} mode={edgeMode} />
        </>
      )}

      {/* Vertical Scrollbar */}
      {hasVertical && (
        <RadixScrollArea.Scrollbar
          orientation="vertical"
          className={styles.scrollbarVertical}
        >
          <RadixScrollArea.Thumb className={styles.thumbVertical} />
        </RadixScrollArea.Scrollbar>
      )}

      {/* Horizontal Scrollbar */}
      {hasHorizontal && (
        <RadixScrollArea.Scrollbar
          orientation="horizontal"
          className={styles.scrollbarHorizontal}
        >
          <RadixScrollArea.Thumb className={styles.thumbHorizontal} />
        </RadixScrollArea.Scrollbar>
      )}

      <RadixScrollArea.Corner className={styles.corner} />
    </RadixScrollArea.Root>
  );
};
