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
          width="76"
          height="76"
          viewBox="0 0 76 76"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.faceIdSvg}
        >
          <defs>
            <linearGradient id="scanBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--text-1)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--text-1)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--text-1)" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="irisGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--text-1)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--text-1)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Faint subtle background guide ring */}
          <circle
            cx="38"
            cy="38"
            r="32"
            stroke="var(--line-1)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            fill="none"
          />

          {!isAuth ? (
            /* ── Authenticating: Apple Biometric Viewfinder & Laser Scan ── */
            <g key="authenticating-group">
              {/* Corner Reticle Brackets (Top-Left, Top-Right, Bottom-Right, Bottom-Left) */}
              <motion.g
                animate={{ scale: [0.97, 1.03, 0.97], opacity: [0.75, 1, 0.75] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                style={{ originX: '38px', originY: '38px' }}
              >
                {/* Top-Left Bracket */}
                <path
                  d="M 23 29 L 23 24 A 5 5 0 0 1 28 19 L 33 19"
                  stroke="var(--text-1)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Top-Right Bracket */}
                <path
                  d="M 43 19 L 48 19 A 5 5 0 0 1 53 24 L 53 29"
                  stroke="var(--text-1)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Bottom-Right Bracket */}
                <path
                  d="M 53 47 L 53 52 A 5 5 0 0 1 48 57 L 43 57"
                  stroke="var(--text-1)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Bottom-Left Bracket */}
                <path
                  d="M 33 57 L 28 57 A 5 5 0 0 1 23 52 L 23 47"
                  stroke="var(--text-1)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </motion.g>

              {/* Gentle Optical Iris Center */}
              <circle cx="38" cy="38" r="18" fill="url(#irisGlow)" />
              <motion.circle
                cx="38"
                cy="38"
                r="14"
                stroke="var(--line-2)"
                strokeWidth="1"
                fill="none"
                animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.4, 0.8, 0.4] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                style={{ originX: '38px', originY: '38px' }}
              />

              {/* Central Crosshair Reticle */}
              <circle cx="38" cy="38" r="2.5" fill="var(--text-1)" />
              <line x1="38" y1="28" x2="38" y2="31" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="38" y1="45" x2="38" y2="48" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="28" y1="38" x2="31" y2="38" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="45" y1="38" x2="48" y2="38" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" />

              {/* Smooth Laser Scan Beam (Vertical Sweep) */}
              <motion.line
                x1="22"
                y1="24"
                x2="54"
                y2="24"
                stroke="url(#scanBeamGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                animate={{ y: [0, 28, 0], opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              />
            </g>
          ) : (
            /* ── Authenticated: Snaps into Closed Circle with Drawn Checkmark ── */
            <g key="authenticated-group">
              {/* Closed Circular Ring */}
              <motion.circle
                cx="38"
                cy="38"
                r="32"
                stroke="var(--text-1)"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0.2, rotate: -90, scale: 0.9 }}
                animate={{ pathLength: 1, rotate: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ originX: '38px', originY: '38px' }}
              />

              {/* Elastic Drawn Checkmark */}
              <motion.path
                d="M 26 39 L 34 47 L 50 29"
                fill="none"
                stroke="var(--text-1)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
              />
            </g>
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
          {title || (isAuth ? 'Authenticated' : 'Verifying…')}
        </motion.p>
        <motion.p
          key={status + '-sub'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className={styles.authSuccessSub}
        >
          {subtitle || (isAuth ? 'Opening workspace…' : 'Validating security credentials')}
        </motion.p>
      </div>
    </div>
  );
};
