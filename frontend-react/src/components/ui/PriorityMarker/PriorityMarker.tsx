import React from 'react';
import clsx from 'clsx';
import { Priority } from '@/lib/constants';
import styles from './PriorityMarker.module.css';

export interface PriorityMarkerProps {
  priority?: Priority | string | null;
  className?: string;
}

export const PriorityMarker: React.FC<PriorityMarkerProps> = ({ priority = 'P3', className }) => {
  const pStr = (priority || 'P3').toString().toUpperCase();
  const pKey = (pStr.toLowerCase() as 'p1' | 'p2' | 'p3' | 'p4') || 'p3';
  return (
    <span
      className={clsx(styles.marker, styles[pKey] || styles.p3, className)}
      role="img"
      aria-label={`Priority ${pStr}`}
    >
      {pStr}
    </span>
  );
};

