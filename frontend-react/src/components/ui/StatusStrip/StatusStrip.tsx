import React from 'react';
import clsx from 'clsx';
import { IncidentStatus, Priority, SlaStatus } from '@/lib/constants';
import { formatReference } from '@/lib/format';
import { StatusLabel } from '../StatusLabel/StatusLabel';
import { PriorityMarker } from '../PriorityMarker/PriorityMarker';
import { LifecycleBar } from '../LifecycleBar/LifecycleBar';
import styles from './StatusStrip.module.css';

export interface StatusStripProps {
  reference: string;
  status: IncidentStatus;
  priority?: Priority | string | null;
  slaStatus?: SlaStatus | null;
  actions?: React.ReactNode;
  className?: string;
}

const LIFECYCLE_STEPS: Record<IncidentStatus, { step: number; label: string }> = {
  NEW: { step: 1, label: 'Step 1 of 7' },
  ASSIGNED: { step: 2, label: 'Step 2 of 7' },
  ACKNOWLEDGED: { step: 3, label: 'Step 3 of 7' },
  IN_PROGRESS: { step: 4, label: 'Step 4 of 7' },
  RESOLVED: { step: 5, label: 'Step 5 of 7' },
  VERIFIED: { step: 6, label: 'Step 6 of 7' },
  CLOSED: { step: 7, label: 'Step 7 of 7' },
};

export const StatusStrip: React.FC<StatusStripProps> = ({
  reference,
  status,
  priority = 'P3',
  slaStatus,
  actions,
  className,
}) => {
  const stepInfo = LIFECYCLE_STEPS[status] || { step: 1, label: 'Step 1 of 7' };

  let tintStyle = styles.stripNormal;
  if (status === 'RESOLVED' || status === 'VERIFIED') {
    tintStyle = styles.stripSuccess;
  } else if (slaStatus === 'BREACHED') {
    tintStyle = styles.stripBreached;
  } else if (slaStatus === 'AT_RISK') {
    tintStyle = styles.stripAtRisk;
  }

  return (
    <section className={clsx(styles.statusStrip, tintStyle, className)} aria-label="Incident status and lifecycle">
      <div className={styles.leftCluster}>
        <span className={styles.reference}>{formatReference(reference)}</span>
        <StatusLabel status={status} />
        <PriorityMarker priority={priority} />
        {actions}
      </div>

      <div className={styles.rightCluster}>
        <div className={styles.lifecycleWrapper}>
          <LifecycleBar status={status} />
        </div>
        <span className={styles.stepCaption}>{stepInfo.label}</span>
      </div>
    </section>
  );
};
