import React from 'react';
import clsx from 'clsx';
import { Priority } from '@/lib/constants';
import styles from './PriorityMarker.module.css';

export interface PriorityMarkerProps {
  priority: Priority;
  className?: string;
}

export const PriorityMarker: React.FC<PriorityMarkerProps> = ({ priority, className }) => {
  const pKey = priority.toLowerCase() as 'p1' | 'p2' | 'p3' | 'p4';
  return (
    <span
      className={clsx(styles.marker, styles[pKey], className)}
      role="img"
      aria-label={`Priority ${priority}`}
    >
      {priority}
    </span>
  );
};

