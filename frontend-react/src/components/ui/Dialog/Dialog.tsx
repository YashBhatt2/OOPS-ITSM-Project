import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from '@phosphor-icons/react';
import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  isSheet?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  isSheet = false,
}) => {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content className={isSheet ? styles.sheetContent : styles.content}>
          {isSheet && <div className={styles.grabber} aria-hidden="true" />}
          <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
          {description && (
            <RadixDialog.Description className={styles.description}>
              {description}
            </RadixDialog.Description>
          )}
          {children}
          {actions && <div className={styles.actions}>{actions}</div>}
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
