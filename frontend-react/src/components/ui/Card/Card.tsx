import React from 'react';
import clsx from 'clsx';
import { Priority, IncidentStatus } from '@/lib/constants';
import { PriorityMarker } from '../PriorityMarker/PriorityMarker';
import { StatusLabel } from '../StatusLabel/StatusLabel';
import { LifecycleBar } from '../LifecycleBar/LifecycleBar';
import styles from './Card.module.css';

export interface IncidentCardProps {
  priority: Priority;
  reference: string;
  title: string;
  serviceName: string;
  status: IncidentStatus;
  timeAgo: string;
  onClick?: () => void;
  className?: string;
}

export const Card: React.FC<IncidentCardProps> = ({
  priority,
  reference,
  title,
  serviceName,
  status,
  timeAgo,
  onClick,
  className,
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={clsx(styles.card, className)}
    >
      <div className={styles.topRow}>
        <div className={styles.refGroup}>
          <PriorityMarker priority={priority} />
          <span className={styles.reference}>{reference}</span>
        </div>
        <span className={styles.time}>{timeAgo}</span>
      </div>
      <div className={styles.title}>{title}</div>
      <div className={styles.metaRow}>
        <span className={styles.serviceName}>{serviceName}</span>
        <span>·</span>
        <StatusLabel status={status} />
      </div>
      <div className={styles.bottomBar}>
        <LifecycleBar status={status} />
      </div>
    </div>
  );
};

