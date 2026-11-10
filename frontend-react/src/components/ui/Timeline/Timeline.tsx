import React from 'react';
import clsx from 'clsx';
import { formatDateTime } from '@/lib/format';
import styles from './Timeline.module.css';

export interface TimelineEntry {
  id: string;
  createdAt: string;
  message: string;
  actorName?: string;
  actorRole?: string;
}

export interface TimelineProps {
  entries: TimelineEntry[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ entries, className }) => {
  return (
    <div className={clsx(styles.timeline, className)}>
      <div className={styles.line} aria-hidden="true" />
      {entries.map((entry, index) => {
        const isLatest = index === 0;
        return (
          <div key={entry.id} className={styles.item}>
            <div
              className={clsx(styles.node, isLatest && styles.latestNode)}
              aria-hidden="true"
            />
            <span className={styles.time}>{formatDateTime(entry.createdAt)}</span>
            <div className={styles.content}>{entry.message}</div>
            {(entry.actorName || entry.actorRole) && (
              <span className={styles.actor}>
                {entry.actorName || entry.actorRole}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

