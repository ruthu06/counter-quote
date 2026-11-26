// A small "i" button that shows or hides a short explanation.
// Click (or Enter/Space) toggles it; Escape or moving focus away closes it.

import { type ReactNode, useId, useState } from 'react';
import styles from './InfoTip.module.css';

export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const tipId = useId();

  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        aria-label={label}
        aria-expanded={open}
        aria-controls={tipId}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        i
      </button>
      {open && (
        <span id={tipId} role="tooltip" className={styles.tip}>
          {children}
        </span>
      )}
    </span>
  );
}
