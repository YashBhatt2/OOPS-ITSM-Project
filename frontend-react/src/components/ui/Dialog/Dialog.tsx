import React, { useRef } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { X } from '@phosphor-icons/react';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { useScrollEdges } from '@/lib/useScrollEdges';
import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  isSheet?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  isSheet = false,
  size = 'medium',
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const { moreAfter } = useScrollEdges(viewportRef, 'vertical');

  const sizeClass =
    size === 'large'
      ? styles.sizeLarge
      : size === 'small'
      ? styles.sizeSmall
      : styles.sizeMedium;

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content
          className={clsx(
            isSheet ? styles.sheetContent : styles.content,
            !isSheet && sizeClass
          )}
        >
          {isSheet && <div className={styles.grabber} aria-hidden="true" />}
          <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
          {description && (
            <RadixDialog.Description className={styles.description}>
              {description}
            </RadixDialog.Description>
          )}

          <ScrollArea
            type="scroll"
            edgeMode="fade"
            orientation="vertical"
            ariaLabel={title}
            viewportRef={viewportRef}
            overscrollContain
            className={styles.dialogScrollArea}
          >
            <div className={styles.body}>{children}</div>
          </ScrollArea>

          {actions && (
            <div className={clsx(styles.actions, moreAfter && styles.actionsBorder)}>
              {actions}
            </div>
          )}

          <RadixDialog.Close asChild aria-label="Close dialog">
            <button type="button" className={styles.closeButton}>
              <X size={20} weight="light" />
            </button>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
