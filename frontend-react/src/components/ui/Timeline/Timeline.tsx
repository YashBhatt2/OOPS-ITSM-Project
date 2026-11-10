import React from 'react';
import clsx from 'clsx';
import { formatDateTime } from '@/lib/format';
import styles from './Timeline.module.css';

export interface TimelineEntry {
  id: string;
  createdAt?: string;
  timestamp?: string;
  message?: string;
  title?: string;
  description?: string;
  actorName?: string;
  actorRole?: string;
  actor?: string;
}

export interface TimelineProps {
  entries?: TimelineEntry[];
  items?: TimelineEntry[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ entries, items, className }) => {
  const list = entries || items || [];
  return (
    <div className={clsx(styles.timeline, className)}>
      <div className={styles.line} aria-hidden="true" />
      {list.map((entry, index) => {
        const isLatest = index === 0;
        const timeDisplay = entry.createdAt
          ? formatDateTime(entry.createdAt)
          : (entry.timestamp || '');
        const messageDisplay = entry.message || entry.title || entry.description || '';
        const actorDisplay = entry.actorName || entry.actorRole || entry.actor;

        return (
          <div key={entry.id} className={styles.item}>
            <div
              className={clsx(styles.node, isLatest && styles.latestNode)}
              aria-hidden="true"
            />
            {timeDisplay && <span className={styles.time}>{timeDisplay}</span>}
            <div className={styles.content}>
              {entry.title && entry.description ? (
                <>
                  <div style={{ fontWeight: 500 }}>{entry.title}</div>
                  <div style={{ color: 'var(--text-2)', fontSize: 'var(--fs-caption)' }}>
                    {entry.description}
                  </div>
                </>
              ) : (
                messageDisplay
              )}
            </div>
            {actorDisplay && (
              <span className={styles.actor}>
                {actorDisplay}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

