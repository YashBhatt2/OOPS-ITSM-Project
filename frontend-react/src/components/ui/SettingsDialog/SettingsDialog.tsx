import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Dialog } from '../Dialog/Dialog';
import { Segmented } from '../Segmented/Segmented';
import styles from './SettingsDialog.module.css';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = (localStorage.getItem('theme-preference') as 'dark' | 'light') || 'dark';
      setTheme(storedTheme === 'light' ? 'light' : 'dark');

      const storedMotion = localStorage.getItem('oops-reduced-motion');
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setReducedMotion(storedMotion === 'true' || (storedMotion === null && prefersReduced));
    } catch {
      // Default fallback
    }
  }, [open]);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    try {
      localStorage.setItem('theme-preference', newTheme);
    } catch {
      // Ignore
    }
    document.documentElement.setAttribute('data-theme', newTheme);
    document.documentElement.setAttribute('data-theme-choice', newTheme);
  };

  const handleMotionToggle = () => {
    const nextVal = !reducedMotion;
    setReducedMotion(nextVal);
    try {
      localStorage.setItem('oops-reduced-motion', nextVal ? 'true' : 'false');
    } catch {
      // Ignore
    }
    if (nextVal) {
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    } else {
      document.documentElement.removeAttribute('data-reduced-motion');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      description="Interface display and accessibility preferences."
    >
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Appearance</p>
        <Segmented
          name="Interface theme"
          options={[
            { value: 'dark', label: 'Obsidian' },
            { value: 'light', label: 'Ceramic' },
          ]}
          value={theme}
          onChange={(v) => handleThemeChange(v as 'dark' | 'light')}
        />
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Accessibility</p>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <p className={styles.rowTitle}>Reduce motion</p>
            <p className={styles.rowDesc}>
              Minimize transition and movement effects across the interface.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={reducedMotion}
            aria-label="Reduce motion toggle"
            className={clsx(styles.switch, reducedMotion && styles.switchActive)}
            onClick={handleMotionToggle}
          >
            <span className={clsx(styles.thumb, reducedMotion && styles.thumbActive)} />
          </button>
        </div>
      </div>
    </Dialog>
  );
};

