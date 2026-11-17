import React, { forwardRef, useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeSlash, WarningCircle } from '@phosphor-icons/react';
import styles from './Field.module.css';

export interface FieldProps {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
  className?: string;
}

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> & FieldProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, helperText, error, className, type = 'text', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const errorId = error ? `${id}-error` : undefined;
    const helperId = helperText ? `${id}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={clsx(styles.fieldGroup, className)}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <div className={styles.inputWrapper}>
          <input
            ref={ref}
            id={id}
            type={effectiveType}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={clsx(styles.input, Boolean(error) && styles.hasError)}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeSlash size={20} weight="light" /> : <Eye size={20} weight="light" />}
            </button>
          )}
        </div>
        {error ? (
          <div id={errorId} className={styles.errorMessage} role="alert">
            <WarningCircle size={16} weight="light" />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <div id={helperId} className={styles.helperText}>
            {helperText}
          </div>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & FieldProps;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, label, helperText, error, className, ...props }, ref) => {
    const errorId = error ? `${id}-error` : undefined;
    const helperId = helperText ? `${id}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={clsx(styles.fieldGroup, className)}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <textarea
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={clsx(styles.textarea, Boolean(error) && styles.hasError)}
          {...props}
        />
        {error ? (
          <div id={errorId} className={styles.errorMessage} role="alert">
            <WarningCircle size={16} weight="light" />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <div id={helperId} className={styles.helperText}>
            {helperText}
          </div>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> &
  FieldProps & {
    options: Array<{ value: string | number; label: string }>;
  };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ id, label, helperText, error, options, className, ...props }, ref) => {
    const errorId = error ? `${id}-error` : undefined;
    const helperId = helperText ? `${id}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={clsx(styles.fieldGroup, className)}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <select
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={clsx(styles.select, Boolean(error) && styles.hasError)}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <div id={errorId} className={styles.errorMessage} role="alert">
            <WarningCircle size={16} weight="light" />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <div id={helperId} className={styles.helperText}>
            {helperText}
          </div>
        ) : null}
      </div>
    );
  }
);
Select.displayName = 'Select';
