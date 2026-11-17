import React, { forwardRef } from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link' | 'glassIcon';
  size?: 'default' | 'large' | 'compact';
  isLoading?: boolean;
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'default',
      isLoading = false,
      iconOnly = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    let sizeClass = styles.default;
    if (size === 'large') {
      sizeClass = iconOnly ? styles.iconOnlyLarge : styles.large;
    } else if (size === 'compact') {
      sizeClass = iconOnly ? styles.iconOnlyCompact : styles.compact;
    } else if (iconOnly) {
      sizeClass = styles.iconOnly;
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          styles.button,
          styles[variant],
          sizeClass,
          (disabled || isLoading) && styles.disabled,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            <span className="sr-only">Loading…</span>
            {!iconOnly && <span>{children}</span>}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

