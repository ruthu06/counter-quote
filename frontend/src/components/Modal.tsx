// A modal box over the page, shared by the confirm and quote dialogs. Built on <dialog>, which
// handles focus, the dimmed backdrop and Escape; this keeps it in step with the `open` prop.

import { type ReactNode, useEffect, useRef } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  /** Escape, a click on the backdrop, or the dialog's own close button. */
  onClose: () => void;
  /** Id of the heading that names the dialog, for screen readers. */
  labelledBy: string;
  /** Widest it gets, in pixels; narrower on small screens. */
  maxWidth: number;
  children: ReactNode;
}

export function Modal({ open, onClose, labelledBy, maxWidth, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.modal}
      style={{ width: `min(${maxWidth}px, calc(100vw - 32px))` }}
      aria-labelledby={labelledBy}
      // Escape closes a <dialog> by itself; let the parent decide, so its state stays in step.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the backdrop (outside the box) closes it too.
      onClick={(event) => event.target === ref.current && onClose()}
    >
      {children}
    </dialog>
  );
}
