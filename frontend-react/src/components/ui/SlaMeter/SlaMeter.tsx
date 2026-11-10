import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { formatDurationParts } from '@/lib/format';
import { SlaStatus } from '@/lib/constants';
import styles from './SlaMeter.module.css';

export interface SlaMeterProps {
  label: 'Response' | 'Resolution';
  dueAt: string | null;
  completedAt?: string | null;
  targetSeconds: number;
  slaStatus?: SlaStatus;
  className?: string;
}

export const SlaMeter: React.FC<SlaMeterProps> = ({
  label,
  dueAt,
  completedAt,
  targetSeconds,
  slaStatus = 'ON_TRACK',
  className,
}) => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (completedAt || !dueAt) return;

    const dueTime = new Date(dueAt).getTime();
    const remainingMs = dueTime - Date.now();

    // Tick every second if under 1 hour remains; otherwise every minute
    const intervalMs = remainingMs < 3600 * 1000 ? 1000 : 60000;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [dueAt, completedAt]);

  if (completedAt) {
    return (
      <div className={clsx(styles.container, className)}>
        <div className={styles.header}>
          <span className={styles.label}>{label}</span>
          <span className={styles.clockContainer}>Met</span>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  if (!dueAt) {
    return (
      <div className={clsx(styles.container, className)}>
        <div className={styles.header}>
          <span className={styles.label}>{label}</span>
          <span className={styles.clockContainer}>—</span>
        </div>
        <div className={styles.track} />
      </div>
    );
  }

  const dueTime = new Date(dueAt).getTime();
  const diffSeconds = Math.round((dueTime - now) / 1000);
  const elapsedSeconds = targetSeconds - diffSeconds;
  const progressRatio = Math.min(Math.max(elapsedSeconds / targetSeconds, 0), 1);
  const percent = Math.round(progressRatio * 100);

  const isBreached = slaStatus === 'BREACHED' || diffSeconds <= 0;
  const isAtRisk = slaStatus === 'AT_RISK' || (!isBreached && progressRatio >= 0.8);

  const duration = formatDurationParts(diffSeconds);

  return (
    <div className={clsx(styles.container, className)}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <div className={styles.clockContainer}>
          {isBreached ? (
            <span className={clsx(styles.statusSignal, styles.breached)}>
              <span className={clsx(styles.dot, styles.dotBreached)} />
              Breached ({Math.abs(Math.round(diffSeconds / 60))}m overdue)
            </span>
          ) : isAtRisk ? (
            <>
              <span className={clsx(styles.statusSignal, styles.atRisk)}>
                <span className={clsx(styles.dot, styles.dotAtRisk)} />
                At risk
              </span>
              <span>
                {duration.primary}
                <span className={styles.dimmed}>{duration.dimmed}</span>
              </span>
            </>
          ) : (
            <span>
              {duration.primary}
              <span className={styles.dimmed}>{duration.dimmed}</span>
            </span>
          )}
        </div>
      </div>
      <div className={styles.track}>
        <div
          className={clsx(
            styles.fill,
            isBreached && styles.fillBreached,
            !isBreached && isAtRisk && styles.fillAtRisk
          )}
          style={{ width: isBreached ? '100%' : `${percent}%` }}
        />
      </div>
    </div>
  );
};

