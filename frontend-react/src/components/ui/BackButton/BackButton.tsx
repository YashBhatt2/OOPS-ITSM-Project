import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import styles from './BackButton.module.css';

export interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  label = 'Back',
  className,
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    if (!to && window.history.state && window.history.state.idx > 0) {
      e.preventDefault();
      navigate(-1);
    }
  };

  if (to) {
    return (
      <Link to={to} className={`${styles.backButton} ${className || ''}`} aria-label={label}>
        <ArrowLeft size={16} weight="light" />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${styles.backButton} ${className || ''}`}
      aria-label={label}
    >
      <ArrowLeft size={16} weight="light" />
      <span>{label}</span>
    </button>
  );
};

