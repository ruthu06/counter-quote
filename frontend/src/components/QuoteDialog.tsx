// The quote for the whole job, opened by Generate quote: each countertop's charges with the
// maths behind them, its subtotal, and the job total.

import { useId } from 'react';
import { formatNumber } from '../lib/geometry';
import type { JobQuote } from '../lib/quote';
import { Modal } from './Modal';
import styles from './QuoteDialog.module.css';

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
/** "$2,400" for lines, with cents only when there are some. Totals always show cents. */
const lineAmount = (n: number) => dollars.format(n).replace(/\.00$/, '');

interface QuoteDialogProps {
  open: boolean;
  onClose: () => void;
  /** e.g. "Joe — Kitchen project". */
  heading: string;
  quote: JobQuote;
  /** Countertops left out because they have no shape yet. */
  skipped: string[];
  /** Whether this matches what's saved, e.g. "Not saved yet. Use Save job at the top to keep it." */
  note: string;
}

export function QuoteDialog({ open, onClose, heading, quote, skipped, note }: QuoteDialogProps) {
  const titleId = useId();
  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} maxWidth={520}>
      <header className={styles.header}>
        <div>
          <h2 id={titleId} className={styles.title}>Quote</h2>
          <p className={styles.subtitle}>{heading}</p>
        </div>
        <button type="button" className={styles.close} aria-label="Close quote" onClick={onClose}>
          ×
        </button>
      </header>

      {quote.countertops.map((c) => (
        <section key={c.id} className={styles.countertop} aria-label={c.name}>
          <h3 className={styles.name}>{c.name || 'Untitled countertop'}</h3>
          <ul className={styles.lines}>
            {c.quote.lines.map((line) => (
              <li key={line.label} className={styles.line}>
                <span className={styles.label}>
                  {line.label}
                  {/* The maths behind the amount, e.g. "30 sq. ft. × $80". */}
                  {line.calc && (
                    <span className={styles.calc}>
                      {formatNumber(line.calc.quantity)} {line.calc.unit} × {lineAmount(line.calc.unitPrice)}
                    </span>
                  )}
                </span>
                <span className={styles.amount}>{lineAmount(line.amount)}</span>
              </li>
            ))}
          </ul>
          <div className={styles.subtotal}>
            <span>Subtotal</span>
            <span>{dollars.format(c.quote.total)}</span>
          </div>
        </section>
      ))}

      {skipped.length > 0 && <p className={styles.note}>Not included, no shape yet: {skipped.join(', ')}.</p>}

      <div className={styles.total}>
        <span>Estimated total</span>
        <span className={styles.totalAmount}>{dollars.format(quote.total)}</span>
      </div>
      <p className={styles.note}>
        An estimate from the measurements and options entered. The shop confirms the final price after measuring on site.
      </p>

      <footer className={styles.footer}>
        <span className={styles.status}>{note}</span>
        <button type="button" className="button" onClick={onClose}>
          Done
        </button>
      </footer>
    </Modal>
  );
}
