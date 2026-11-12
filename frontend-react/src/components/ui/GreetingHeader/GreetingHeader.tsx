import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { PRODUCT_NAME } from '@/lib/constants';
import {
  getGreeting,
  formatGreetingDate,
  recordGreetingVisit,
  SupportingSentence,
} from '@/lib/greeting';
import styles from './GreetingHeader.module.css';

export interface GreetingHeaderProps {
  displayName?: string | null;
  userId?: string | null;
  supportingSentence?: SupportingSentence | null;
  isSentenceLoading?: boolean;
  isSentenceError?: boolean;
  className?: string;
}

export const GreetingHeader: React.FC<GreetingHeaderProps> = ({
  displayName,
  userId,
  supportingSentence,
  isSentenceLoading = false,
  isSentenceError = false,
  className,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());

  // Set document title according to DESIGN.md
  useEffect(() => {
    document.title = `Home - ${PRODUCT_NAME}`;
  }, []);

  // Re-evaluate on tab focus and every 5 minutes
  useEffect(() => {
    const handleReevaluate = () => {
      setNow(new Date());
    };

    window.addEventListener('focus', handleReevaluate);
    const interval = setInterval(handleReevaluate, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', handleReevaluate);
      clearInterval(interval);
    };
  }, []);

  // Compute greeting info purely from current clock and identity
  const greeting = useMemo(() => {
    return getGreeting(displayName, userId, now);
  }, [displayName, userId, now]);

  // Record visit in storage after greeting renders
  useEffect(() => {
    recordGreetingVisit(userId, now);
  }, [userId]);

  const eyebrowText = useMemo(() => {
    return formatGreetingDate(now);
  }, [now]);

  return (
    <header className={clsx(styles.greetingContainer, className)} aria-label="Home page header">
      {/* Cinematic atmospheric bloom (dark mode only; shifts tint by time band) */}
      <div
        className={styles.bloomBackdrop}
        style={{ background: greeting.bloomToken }}
        aria-hidden="true"
      />

      <div className={styles.contentBlock}>
        {/* 1. Eyebrow: Weekday and Date in tracked caps, no clock */}
        <div className={styles.eyebrow}>{eyebrowText}</div>

        {/* 2. Greeting in serif-title role with italicized first name */}
        <h1 className={styles.title}>
          <span>{greeting.salutation}</span>
          {greeting.firstName ? (
            <>
              {', '}
              <span className={styles.nameItalic}>{greeting.firstName}</span>
            </>
          ) : null}
          <span>.</span>
        </h1>

        {/* 3. Supporting sentence */}
        {isSentenceLoading ? (
          <div
            className={styles.sentenceSkeleton}
            aria-busy="true"
            aria-label="Loading status summary"
          />
        ) : isSentenceError || !supportingSentence ? null : (
          <p className={styles.sentence}>
            <span>{supportingSentence.prefix}</span>
            {supportingSentence.linkText && supportingSentence.linkHref ? (
              <Link to={supportingSentence.linkHref} className={styles.sentenceLink}>
                {supportingSentence.linkText}
              </Link>
            ) : null}
            <span>{supportingSentence.suffix || ''}</span>
          </p>
        )}
      </div>
    </header>
  );
};

export default GreetingHeader;

