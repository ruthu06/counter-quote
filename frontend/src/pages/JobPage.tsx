import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { type Job, getJob } from '../api';
import { CounterCanvas, EmptyCanvas } from '../components/CounterCanvas';
import { CountertopList } from '../components/CountertopList';
import { DesignControls } from '../components/DesignControls';
import { FinishControls } from '../components/FinishControls';
import { QuoteDialog } from '../components/QuoteDialog';
import { usePricing } from '../hooks/usePricing';
import { type JobDesignApi, useJobDesign } from '../hooks/useJobDesign';
import { useSaveJob } from '../hooks/useSaveJob';
import { parseJobDesign } from '../lib/designStorage';
import { formatNumber, shapeToPolygon } from '../lib/geometry';
import { type JobQuote, quoteJob } from '../lib/quote';
import styles from './JobPage.module.css';

export function JobPage() {
  const id = Number(useParams().id);
  const { data: job, error } = useQuery({ queryKey: ['jobs', id], queryFn: () => getJob(id) });

  if (error) return <p className="errors">{error.message}</p>;
  if (!job) return <p>Loading…</p>;

  // Keyed by job, so opening another job starts from its own countertops.
  return <JobWorkspace key={job.id} job={job} />;
}

/**
 * Countertop list | drawing of the selected countertop | its customization, with a bar at the
 * bottom for the whole job. A new job has no countertops: a blank canvas until one is added.
 */
function JobWorkspace({ job }: { job: Job }) {
  const countertops = useJobDesign(parseJobDesign(job.designJson));
  // For the prices next to options; the rest of the page works while it loads.
  const { data: prices, error: pricesError, refetch: retryPrices, isFetching: loadingPrices } = usePricing();
  // Editable in the header, e.g. "Kitchen project".
  const [title, setTitle] = useState(job.title);
  const { selected, selectedApi } = countertops;
  const saving = useSaveJob(job, countertops.jobDesign, title);

  const all = countertops.jobDesign.countertops;
  // Every countertop with a shape goes on the drawing; the selected one is drawn in full.
  const pieces = all.flatMap((c) => (c.design ? [{ id: c.id, name: c.name, design: c.design, position: c.position }] : []));
  const priced = prices ? quoteJob(all, prices) : undefined;

  // Saving stores the total too, so it needs valid measurements and every price found.
  const cantPrice = countertops.invalid.length
    ? `Fix the measurements on ${countertops.invalid.join(', ')}`
    : !priced
      ? pricesError
        ? 'Prices couldn’t be loaded'
        : 'Waiting for prices'
      : priced.errors.length
        ? `Can't price this yet: ${priced.errors.join(' ')}`
        : undefined;

  return (
    <>
      <header>
        <div className={styles.headerRow}>
          <h1>
            <Link to="/" className={styles.backLink} aria-label="Back to jobs">←</Link>
            CounterQuote
          </h1>
          <div className={styles.saveArea}>
            <span className="muted">Job #{String(job.id).padStart(3, '0')}</span>
            <span className={styles.saveStatus} role="status">
              {saveStatus(saving)}
            </span>
            <button
              type="button"
              className="button"
              disabled={!!cantPrice || saving.saving || !saving.unsaved}
              title={cantPrice ?? (saving.unsaved ? undefined : 'No changes to save')}
              onClick={() => priced && saving.save(priced.total)}
            >
              {saving.saving ? 'Saving…' : 'Save job'}
            </button>
          </div>
        </div>
        <p className={styles.subtitle}>
          {job.customerName} —{' '}
          <input
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a project title"
            maxLength={100}
            aria-label="Job title"
          />
        </p>
      </header>

      {/* Without prices nothing can be saved or quoted, so say so and offer a retry rather than waiting forever. */}
      {pricesError && !prices && (
        <div className={`errors ${styles.pricesError}`} role="alert">
          <span>Couldn’t load prices: {pricesError.message}. Designs can still be drawn, but not saved or quoted.</span>
          <button type="button" className="button" disabled={loadingPrices} onClick={() => retryPrices()}>
            {loadingPrices ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      <div className={styles.workspace}>
        <section className="card">
          <CountertopList job={countertops} />
        </section>

        <section className="card" aria-label="Drawing">
          <div className={styles.canvasHeader}>
            <h2 className={styles.canvasTitle}>{selected?.name || 'Drawing'}</h2>
            <span className="muted">Top view</span>
          </div>
          {pieces.length ? (
            <CounterCanvas
              pieces={pieces}
              selectedId={selected?.id ?? null}
              onSelect={countertops.select}
              onMovePiece={countertops.move}
              onMoveSink={selectedApi?.moveSink}
              onResize={selectedApi ? (field, value) => selectedApi.setDimension(field, String(value)) : undefined}
              message={selected && !selectedApi ? `Pick a shape for ${selected.name || 'this countertop'}` : undefined}
            />
          ) : (
            <EmptyCanvas message={selected ? `Pick a shape for ${selected.name || 'this countertop'}` : 'Add a countertop to start'} />
          )}
        </section>

        <section className="card" aria-label="Customization">
          <h2 className={styles.panelTitle}>Customization</h2>
          {selected ? (
            <>
              <p className={styles.editing}>Editing: {selected.name || 'Untitled'}</p>
              <label className={`field ${styles.nameField}`}>
                Countertop name
                <input
                  className="control"
                  value={selected.name}
                  onChange={(e) => countertops.rename(selected.id, e.target.value)}
                  placeholder="e.g. Kitchen countertop"
                  maxLength={60}
                />
              </label>
              {selectedApi ? (
                <>
                  <DesignControls api={selectedApi} prices={prices} />
                  <FinishControls api={selectedApi} prices={prices} />
                </>
              ) : (
                <p className="muted">Pick a shape on its card to start.</p>
              )}
            </>
          ) : (
            <p className="muted">Add a countertop to customize it.</p>
          )}
        </section>
      </div>

      <JobBar
        heading={[job.customerName.trim(), title.trim()].filter(Boolean).join(' — ')}
        countertops={countertops}
        priced={priced}
        cantPrice={cantPrice}
        unsaved={saving.unsaved}
      />
    </>
  );
}

/** Short line beside the Save button. */
function saveStatus(s: ReturnType<typeof useSaveJob>): string {
  if (s.saving) return '';
  if (s.error) return `Couldn’t save: ${s.error.message}`;
  return s.unsaved ? 'Unsaved changes' : 'All changes saved';
}

/**
 * The bar along the bottom, for the whole job: how many countertops, their combined area, and
 * Generate quote, which opens the itemised quote. It doesn't save; Save job at the top does.
 */
function JobBar(props: {
  /** e.g. "Joe — Kitchen project", for the quote's heading. */
  heading: string;
  countertops: JobDesignApi;
  priced?: JobQuote;
  /** Why there's no price right now, if there isn't one. */
  cantPrice?: string;
  unsaved: boolean;
}) {
  const { heading, countertops, priced, cantPrice, unsaved } = props;
  const [showQuote, setShowQuote] = useState(false);

  const all = countertops.jobDesign.countertops;
  const drawn = all.filter((c) => c.design);
  const area = drawn.reduce((sum, c) => sum + shapeToPolygon(c.design!).areaSqFt, 0);
  const cantQuote = drawn.length ? cantPrice : 'Add a countertop and pick its shape first';

  return (
    <div className={styles.bar}>
      <div className={styles.barSummary}>
        <strong className={styles.barCount}>
          {all.length} countertop{all.length === 1 ? '' : 's'}
        </strong>
        <span className={styles.barArea}>{formatNumber(area)} sq. ft. combined</span>
      </div>
      <button
        type="button"
        className={`button ${styles.generate}`}
        disabled={!!cantQuote}
        title={cantQuote}
        onClick={() => setShowQuote(true)}
      >
        Generate quote →
      </button>

      {priced && (
        <QuoteDialog
          open={showQuote}
          onClose={() => setShowQuote(false)}
          heading={heading}
          quote={priced}
          skipped={all.filter((c) => !c.design).map((c) => c.name || 'Untitled')}
          note={unsaved ? 'Not saved yet. Use Save job at the top to keep it.' : 'Matches the saved job.'}
        />
      )}
    </div>
  );
}
