import React from 'react';
import clsx from 'clsx';
import { formatDateTime } from '@/lib/format';
import styles from './Comment.module.css';

export interface CommentProps {
  id: string;
  authorName: string;
  createdAt: string;
  body: string;
  kind?: 'PUBLIC' | 'COMMENT' | 'NOTE' | 'REPLY' | 'INFORMATION_REQUEST' | 'INTERNAL_NOTE';
  isReply?: boolean;
  className?: string;
}

export const Comment: React.FC<CommentProps> = ({
  authorName,
  createdAt,
  body,
  kind = 'PUBLIC',
  isReply = false,
  className,
}) => {
  const initials = authorName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join('') || '?';

  return (
    <div className={clsx(styles.entry, isReply && styles.reply, className)}>
      <div className={styles.avatar} aria-hidden="true">
        {initials}
      </div>
      <div className={styles.bodyContainer}>
        <div className={styles.header}>
          <span className={styles.author}>{authorName}</span>
          <span className={styles.time}>{formatDateTime(createdAt)}</span>
          {kind === 'INFORMATION_REQUEST' && (
            <span className={clsx(styles.tag, styles.infoRequestTag)}>
              Information request
            </span>
          )}
          {kind === 'INTERNAL_NOTE' && (
            <span className={clsx(styles.tag, styles.internalTag)}>Internal</span>
          )}
        </div>
        <div className={styles.text}>{body}</div>
      </div>
    </div>
  );
};

