import React from 'react';
import clsx from 'clsx';
import styles from './StatTile.module.css';

export interface StatTileProps {
  label: string;
  value: number | string;
  changeText?: string;
  changeDirection?: 'good' | 'bad' | 'neutral';
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  changeText,
  changeDirection = 'neutral',
  className,
}) => {
  return (
    <div className={clsx(styles.tile, className)}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {changeText && (
        <span
          className={clsx(
            styles.changeLine,
            changeDirection === 'good' && styles.good,
            changeDirection === 'bad' && styles.bad
          )}
        >
          {changeText}
        </span>
      )}
    </div>
  );
};

