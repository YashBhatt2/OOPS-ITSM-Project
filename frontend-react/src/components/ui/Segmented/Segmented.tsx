import { useId } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import styles from './Segmented.module.css';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  name?: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
  name,
}: SegmentedProps<T>) {
  const instanceId = useId();

  return (
    <div className={clsx(styles.track, className)} role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={clsx(styles.segment, isSelected && styles.active)}
            onClick={() => onChange(opt.value)}
          >
            {isSelected && (
              <motion.div
                layoutId={`segmented-active-pill-${instanceId}`}
                className={styles.activePill}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className={styles.labelSpan}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
