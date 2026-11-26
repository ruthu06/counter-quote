// A small "are you sure?" dialog in the app's own style, for deleting a job or removing a countertop.

import { type ReactNode, useId } from 'react';
import styles from './ConfirmDialog.module.css';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** e.g. "Delete" or "Remove". */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId();
  return (
    <Modal open={open} onClose={onCancel} labelledBy={titleId} maxWidth={360}>
      <h2 id={titleId} className={styles.title}>{title}</h2>
      <div className={styles.body}>{children}</div>
      <div className={styles.actions}>
        {/* Cancel first and focused by default, so Enter never deletes by accident. */}
        <button type="button" className={styles.cancel} onClick={onCancel} autoFocus>
          Cancel
        </button>
        <button type="button" className={styles.confirm} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
