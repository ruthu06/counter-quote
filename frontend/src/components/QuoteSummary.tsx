// The "Quote Summary" card: one line per charge and the estimated total, from lib/quote.

import type { PricingItem } from '../api';
import { type Design, formatNumber } from '../lib/geometry';
import { quote } from '../lib/quote';
import { InfoTip } from './InfoTip';
import styles from './QuoteSummary.module.css';

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
/** Lines read like the mock: "$2,400", with cents only when there are some. The total always shows cents. */
const lineAmount = (n: number) => dollars.format(n).replace(/\.00$/, '');

interface QuoteSummaryProps {
  /** The design being shown on the drawing (always valid). */
  design: Design;
  prices?: PricingItem[];
  pricesError?: Error | null;
  /** True while the typed measurements are invalid, so the price is for the last valid ones. */
  stale?: boolean;
}

export function QuoteSummary({ design, prices, pricesError, stale }: QuoteSummaryProps) {
  return (
    <section className={`card ${styles.summary}`} aria-labelledby="quote-title">
      <h2 id="quote-title" className={styles.title}>
        Quote Summary
        <InfoTip label="About this quote">
          An estimate from the measurements and options above. The shop confirms the final price after measuring on
          site.
        </InfoTip>
      </h2>
      <QuoteBody design={design} prices={prices} pricesError={pricesError} stale={stale} />
    </section>
  );
}

function QuoteBody({ design, prices, pricesError, stale }: QuoteSummaryProps) {
  if (pricesError) return <p className="errors">Couldn’t load prices: {pricesError.message}</p>;
  if (!prices) return <p className="muted">Loading prices…</p>;

  const { lines, total, errors } = quote(design, prices);
  if (errors.length) {
    return (
      <div className="errors">
        Can’t price this design:
        <ul className={styles.errorList}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <>
      <ul className={styles.lines}>
        {lines.map((line) => (
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
      <div className={styles.total}>
        <span>Estimated total</span>
        {/* Announced to screen readers when it changes. */}
        <span className={styles.totalAmount} aria-live="polite">
          {dollars.format(total)}
        </span>
      </div>
      {stale && <p className={styles.note}>Showing the price for the last valid measurements.</p>}
    </>
  );
}
