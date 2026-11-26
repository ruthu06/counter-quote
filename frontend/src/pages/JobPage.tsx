import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { type Job, getJob } from '../api';
import { CounterCanvas, EmptyCanvas } from '../components/CounterCanvas';
import { DesignControls, ShapeTiles, shapeName } from '../components/DesignControls';
import { FinishControls } from '../components/FinishControls';
import { QuoteSummary } from '../components/QuoteSummary';
import { useDesign } from '../hooks/useDesign';
import { usePricing } from '../hooks/usePricing';
import { useSaveJob } from '../hooks/useSaveJob';
import { parseDesign } from '../lib/designStorage';
import { type Design, newDesign } from '../lib/geometry';
import { isMaterial } from '../lib/materials';
import { quote } from '../lib/quote';
import styles from './JobPage.module.css';

export function JobPage() {
  const id = Number(useParams().id);
  const { data: job, error } = useQuery({ queryKey: ['jobs', id], queryFn: () => getJob(id) });

  if (error) return <p className="errors">{error.message}</p>;
  if (!job) return <p>Loading…</p>;

  // Keyed by job, so opening another job starts its own design.
  return <JobEditor key={job.id} job={job} />;
}

/**
 * A job with a saved drawing opens straight into the editor. A job without one starts on an
 * empty canvas, and the editor opens once a shape is picked.
 */
function JobEditor({ job }: { job: Job }) {
  const [initial, setInitial] = useState<Design | null>(() => parseDesign(job.designJson));
  // Editable in the header, so jobs created without a title can get one; saved with Save job.
  const [title, setTitle] = useState(job.title);

  if (!initial) {
    const material = isMaterial(job.material) ? job.material : 'Quartz';
    return (
      <>
        <JobHeader job={job} title={title} onTitle={setTitle} titleHint="Countertop (add a title)">
          <span className={styles.saveStatus}>Not saved yet</span>
          <button type="button" className="button" disabled title="Pick a shape first">
            Save job
          </button>
        </JobHeader>
        <div className={styles.workspace}>
          <section className="card">
            <h2>Design Controls</h2>
            {/* Starts in the stone picked when the job was created. */}
            <ShapeTiles onPick={(shape) => setInitial(newDesign(shape, material))} />
            <p className={styles.startHint}>Pick a shape to start drawing. You can change it any time.</p>
          </section>
          <section className="card">
            <h2 className="panel-label">Drawing Canvas</h2>
            <EmptyCanvas />
          </section>
          <aside className={styles.quote}>
            <section className="card">
              <h2>Quote Summary</h2>
              <p className="muted">The price appears once there’s a drawing.</p>
            </section>
          </aside>
        </div>
      </>
    );
  }

  return <DesignEditor job={job} initial={initial} title={title} onTitle={setTitle} />;
}

function DesignEditor(props: { job: Job; initial: Design; title: string; onTitle: (title: string) => void }) {
  const { job, initial, title, onTitle } = props;
  const api = useDesign(initial);
  // For the prices next to options and the quote; the rest of the page works while it loads.
  const { data: prices, error: pricesError } = usePricing();
  const saving = useSaveJob(job, api.design, title);

  // Save only what can be priced: measurements valid and every price found.
  const invalid = Object.keys(api.errors).length > 0;
  const priced = prices && !invalid ? quote(api.design, prices) : undefined;
  const cantSaveReason = !prices
    ? 'Waiting for prices'
    : invalid
      ? 'Fix the measurements first'
      : priced?.errors.length
        ? 'This design can’t be priced'
        : undefined;

  return (
    <>
      <JobHeader job={job} title={title} onTitle={onTitle} titleHint={`${shapeName(api.design.shape)} Countertop (add a title)`}>
        <span className={styles.saveStatus} role="status">
          {saveStatus(saving)}
        </span>
        <button
          type="button"
          className="button"
          disabled={!!cantSaveReason || saving.saving || (!saving.unsaved && !saving.neverSaved)}
          title={cantSaveReason}
          onClick={() => priced && saving.save(priced.total)}
        >
          {saving.saving ? 'Saving…' : 'Save job'}
        </button>
      </JobHeader>

      <div className={styles.workspace}>
        <section className="card">
          <h2>Design Controls</h2>
          <DesignControls api={api} prices={prices} />
          <FinishControls api={api} prices={prices} />
        </section>
        <section className="card">
          <h2 className="panel-label">Drawing Canvas</h2>
          <CounterCanvas
            design={api.design}
            onMoveSink={api.moveSink}
            onResize={(field, value) => api.setDimension(field, String(value))}
          />
        </section>
        <aside className={styles.quote}>
          <QuoteSummary design={api.design} prices={prices} pricesError={pricesError} stale={invalid} />
        </aside>
      </div>
    </>
  );
}

/** Back link, job number, save controls (children) and the editable title. */
function JobHeader(props: {
  job: Job;
  title: string;
  onTitle: (title: string) => void;
  titleHint: string;
  children: ReactNode;
}) {
  const { job, title, onTitle, titleHint, children } = props;
  return (
    <header>
      <div className={styles.headerRow}>
        <h1>
          <Link to="/" className={styles.backLink} aria-label="Back to jobs">←</Link>
          CounterQuote
        </h1>
        <div className={styles.saveArea}>
          <span className="muted">Job #{String(job.id).padStart(3, '0')}</span>
          {children}
        </div>
      </div>
      <p className={styles.subtitle}>
        {job.customerName} —{' '}
        <input
          className={styles.titleInput}
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder={titleHint}
          maxLength={100}
          aria-label="Job title"
        />
      </p>
    </header>
  );
}

/** Short line beside the Save button. */
function saveStatus(s: ReturnType<typeof useSaveJob>): string {
  if (s.saving) return '';
  if (s.error) return `Couldn’t save: ${s.error.message}`;
  if (s.neverSaved) return 'Not saved yet';
  return s.unsaved ? 'Unsaved changes' : 'All changes saved';
}
