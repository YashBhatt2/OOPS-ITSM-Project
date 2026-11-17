import React from 'react';
import clsx from 'clsx';
import { Check } from '@phosphor-icons/react';
import { IncidentStatus } from '@/lib/constants';
import styles from './StatusLabel.module.css';

export interface StatusLabelProps {
  status: IncidentStatus;
  className?: string;
  showText?: boolean;
}

const STATUS_TEXT: Record<IncidentStatus, string> = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  VERIFIED: 'Verified',
  CLOSED: 'Closed',
};

export const StatusLabel: React.FC<StatusLabelProps> = ({
  status,
  className,
  showText = true,
}) => {
  const text = STATUS_TEXT[status] || status;

  const renderDot = () => {
    switch (status) {
      case 'NEW':
        return <span className={clsx(styles.dot, styles.new)} aria-hidden="true" />;
      case 'ASSIGNED':
        return <span className={clsx(styles.dot, styles.assigned)} aria-hidden="true" />;
      case 'ACKNOWLEDGED':
        return <span className={clsx(styles.dot, styles.acknowledged)} aria-hidden="true" />;
      case 'IN_PROGRESS':
        return <span className={clsx(styles.dot, styles.inProgress)} aria-hidden="true" />;
      case 'RESOLVED':
        return <span className={clsx(styles.dot, styles.resolved)} aria-hidden="true" />;
      case 'VERIFIED':
        return (
          <span className={styles.verified} aria-hidden="true">
            <Check size={14} weight="bold" />
          </span>
        );
      case 'CLOSED':
        return <span className={clsx(styles.dot, styles.closed)} aria-hidden="true" />;
    }
  };

  return (
    <span className={clsx(styles.wrapper, className)} title={text}>
      {renderDot()}
      {showText && <span>{text}</span>}
    </span>
  );
};

