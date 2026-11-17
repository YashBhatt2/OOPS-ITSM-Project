import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { PRODUCT_NAME } from '@/lib/constants';
import styles from './Brand.module.css';

export interface BrandMarkProps {
  size?: number;
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ size = 24, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(styles.markSvg, className)}
      aria-hidden="true"
    >
      {/* 1.5px stroke ring */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      {/* 5px filled red signal dot at 2 o'clock */}
      <circle cx="18.36" cy="5.64" r="2.5" fill="var(--red-fill)" />
    </svg>
  );
};

export const Brand: React.FC<{ to?: string; className?: string }> = ({
  to = '/',
  className,
}) => {
  return (
    <Link to={to} className={clsx(styles.brandLink, className)}>
      <BrandMark size={24} />
      <span className={styles.wordmark}>{PRODUCT_NAME}</span>
    </Link>
  );
};

