import React from 'react';
import clsx from 'clsx';
import { formatDateTime } from '@/lib/format';
import styles from './IncidentDetailsCard.module.css';

export interface IncidentDetailsCardProps {
  incident?: {
    assigneeName?: string | null;
    serviceName?: string | null;
    categoryName?: string | null;
    impact?: number | string | null;
    urgency?: number | string | null;
    reporterName?: string | null;
    createdAt?: string;
    updatedAt?: string | null;
    [key: string]: any;
  };
  assigneeName?: string | null;
  serviceName?: string | null;
  categoryName?: string | null;
  impact?: number | string | null;
  urgency?: number | string | null;
  reporterName?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  className?: string;
}

const LEVEL_LABELS: Record<string, string> = {
  '1': 'Low',
  '2': 'Medium',
  '3': 'High',
};

export const IncidentDetailsCard: React.FC<IncidentDetailsCardProps> = ({
  incident,
  assigneeName,
  serviceName,
  categoryName,
  impact,
  urgency,
  reporterName,
  createdAt,
  updatedAt,
  className,
}) => {
  const effAssignee = assigneeName ?? incident?.assigneeName;
  const effService = serviceName ?? incident?.serviceName;
  const effCategory = categoryName ?? incident?.categoryName;
  const effImpact = impact ?? incident?.impact;
  const effUrgency = urgency ?? incident?.urgency;
  const effReporter = reporterName ?? incident?.reporterName;
  const effCreated = createdAt ?? incident?.createdAt ?? new Date().toISOString();
  const effUpdated = updatedAt ?? incident?.updatedAt;

  const impLabel = effImpact ? (LEVEL_LABELS[String(effImpact)] || String(effImpact)) : '—';
  const urgLabel = effUrgency ? (LEVEL_LABELS[String(effUrgency)] || String(effUrgency)) : '—';

  return (
    <div className={clsx(styles.detailsCard, className)} aria-label="Incident metadata details">
      <div className={styles.eyebrow}>Details</div>

      <dl className={styles.dl}>
        <dt className={styles.dt}>Assignee</dt>
        <dd className={styles.dd}>{effAssignee || 'Unassigned'}</dd>

        <dt className={styles.dt}>Service</dt>
        <dd className={styles.dd}>{effService || '—'}</dd>

        <dt className={styles.dt}>Category</dt>
        <dd className={styles.dd}>{effCategory || '—'}</dd>

        <dt className={styles.dt}>Impact / Urgency</dt>
        <dd className={styles.dd}>{impLabel} / {urgLabel}</dd>

        <dt className={styles.dt}>Reporter</dt>
        <dd className={styles.dd}>{effReporter || 'Employee'}</dd>

        <dt className={styles.dt}>Created</dt>
        <dd className={styles.dd}>{formatDateTime(effCreated)}</dd>

        {effUpdated && effUpdated !== effCreated && (
          <>
            <dt className={styles.dt}>Updated</dt>
            <dd className={styles.dd}>{formatDateTime(effUpdated)}</dd>
          </>
        )}
      </dl>
    </div>
  );
};
