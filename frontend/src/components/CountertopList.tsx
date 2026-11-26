// The left panel: the job's countertops as cards. Click a card to edit it; the selected card
// shows the shape tiles. Add a countertop, or remove one (asks first if it has a drawing).

import { useState } from 'react';
import { type CountertopItem, type JobDesignApi, MAX_COUNTERTOPS } from '../hooks/useJobDesign';
import type { ShapeKind } from '../lib/geometry';
import { gradeName } from '../lib/materials';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './CountertopList.module.css';
import { ShapeTiles } from './ShapeTiles';

const SHAPE_LABELS: Record<ShapeKind, string> = { rectangle: 'Rectangle', L: 'L-shape', U: 'U-shape' };

/** e.g. "L-shape · Quartz Premium", or a nudge when no shape is picked yet. */
function summary(item: CountertopItem): string {
  const d = item.edit?.design;
  return d ? `${SHAPE_LABELS[d.shape]} · ${d.material} ${gradeName(d.grade)}` : 'Pick a shape';
}

export function CountertopList({ job }: { job: JobDesignApi }) {
  // The countertop waiting for "Remove" to be confirmed, if any.
  const [toRemove, setToRemove] = useState<CountertopItem | null>(null);

  const askRemove = (item: CountertopItem) => {
    // Nothing drawn yet means nothing to lose, so no need to ask.
    if (item.edit) setToRemove(item);
    else job.remove(item.id);
  };

  return (
    <div className={styles.list}>
      <h2 className={styles.heading}>
        Countertops <span className={styles.count}>({job.items.length})</span>
      </h2>

      {job.items.map((item) => {
        const selected = item.id === job.selected?.id;
        return (
          <div key={item.id} className={`${styles.card} ${selected ? styles.selected : ''}`}>
            <div className={styles.cardTop}>
              <button type="button" className={styles.select} aria-pressed={selected} onClick={() => job.select(item.id)}>
                <span className={styles.name}>{item.name || 'Untitled'}</span>
                <span className={styles.summary}>{summary(item)}</span>
              </button>
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${item.name || 'countertop'}`}
                title="Remove"
                onClick={() => askRemove(item)}
              >
                ×
              </button>
            </div>
            {selected && (
              <ShapeTiles
                selected={item.edit?.design.shape}
                onPick={(shape) => job.pickShape(item.id, shape)}
              />
            )}
          </div>
        );
      })}

      <button type="button" className={styles.add} onClick={job.add} disabled={!job.canAdd}>
        + Add countertop
      </button>
      <p className={styles.hint}>
        {!job.canAdd
          ? `Up to ${MAX_COUNTERTOPS} countertops per job.`
          : job.items.length
            ? 'Select a countertop to edit its design.'
            : 'Add a countertop to start, e.g. the main run or an island.'}
      </p>

      <ConfirmDialog
        open={toRemove !== null}
        title={`Remove ${toRemove?.name || 'this countertop'}?`}
        confirmLabel="Remove"
        onCancel={() => setToRemove(null)}
        onConfirm={() => {
          if (toRemove) job.remove(toRemove.id);
          setToRemove(null);
        }}
      >
        Its drawing and options will be removed from this job.
      </ConfirmDialog>
    </div>
  );
}
