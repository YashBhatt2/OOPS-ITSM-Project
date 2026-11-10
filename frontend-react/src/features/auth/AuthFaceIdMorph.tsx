import React from 'react';
import { motion } from 'motion/react';
import styles from './AuthPages.module.css';

export interface AuthFaceIdMorphProps {
  status: 'authenticating' | 'authenticated';
  title?: string;
  subtitle?: string;
}

export const AuthFaceIdMorph: React.FC<AuthFaceIdMorphProps> = ({
  status,
  title,
  subtitle,
}) => {
  const isAuth = status === 'authenticated';

  return (
    <div className={styles.authSuccessBox} style={{ background: 'transparent' }}>
      <div className={styles.faceIdContainer} aria-hidden="true">
        <svg
          width="68"
          height="68"
          viewBox="0 0 68 68"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.faceIdSvg}
        >
          {/* Faint background track */}
          <circle
            cx="34"
            cy="34"
            r="30"
            stroke="var(--line-2)"
            strokeWidth="2"
            fill="none"
          />

          {/* Morphing ring: rotating arc during authenticating, full circle on authenticated */}
          {!isAuth ? (
            <motion.circle
              cx="34"
              cy="34"
              r="30"
              stroke="var(--text-1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="188.5"
              strokeDashoffset="120"
              style={{ originX: '34px', originY: '34px' }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, ease: 'linear', duration: 0.85 }}
            />
          ) : (
            <motion.circle
              cx="34"
              cy="34"
              r="30"
              stroke="var(--text-1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0.35, rotate: -45 }}
              animate={{ pathLength: 1, rotate: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          )}

          {/* Center: scanning pulse during auth, checkmark on success */}
          {!isAuth ? (
            <motion.circle
              cx="34"
              cy="34"
              r="3.5"
              fill="var(--text-2)"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
            />
          ) : (
            <motion.path
              d="M 22 35 L 30 43 L 46 27"
              fill="none"
              stroke="var(--text-1)"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            />
          )}
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'center' }}>
        <motion.p
          key={status + '-title'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={isAuth ? styles.authSuccessTitle : styles.authLoadingTitle}
        >
          {title || (isAuth ? 'Authenticated' : 'Authenticating…')}
        </motion.p>
        <motion.p
          key={status + '-sub'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className={styles.authSuccessSub}
        >
          {subtitle || (isAuth ? 'Loading workspace…' : 'Verifying credentials with server')}
        </motion.p>
      </div>
    </div>
  );
};

