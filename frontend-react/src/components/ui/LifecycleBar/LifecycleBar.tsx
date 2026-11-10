import React from 'react';
import clsx from 'clsx';
import { IncidentStatus } from '@/lib/constants';
import styles from './LifecycleBar.module.css';

export interface LifecycleBarProps {
  status: IncidentStatus;
  className?: string;
}

const STAGES: IncidentStatus[] = [
  'NEW',
  'ASSIGNED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLVED',
  'VERIFIED',
  'CLOSED',
];

const STAGE_LABELS: Record<IncidentStatus, string> = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  VERIFIED: 'Verified',
  CLOSED: 'Closed',
};

export const LifecycleBar: React.FC<LifecycleBarProps> = ({ status, className }) => {
  const currentIndex = STAGES.indexOf(status);
  const isClosed = status === 'CLOSED';
  const stageNumber = currentIndex + 1;
  const label = isClosed
    ? 'Stage 7 of 7: Closed'
    : `Stage ${stageNumber} of 7: ${STAGE_LABELS[status] || status}`;

  return (
    <div
      className={clsx(styles.bar, className)}
      role="img"
      aria-label={label}
      title={label}
    >
      {STAGES.map((s, idx) => {
        const isFilled = idx <= currentIndex;
        return (
          <div
            key={s}
            className={clsx(
              styles.segment,
              isFilled && styles.filled,
              isClosed && styles.closed
            )}
          />
        );
      })}
    </div>
  );
};

