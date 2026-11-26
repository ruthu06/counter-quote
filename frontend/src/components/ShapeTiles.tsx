// The three shape buttons (rectangle, L, U), shown on the selected countertop's card in the list.

import type { ShapeKind } from '../lib/geometry';
import styles from './ShapeTiles.module.css';

const SHAPES: { shape: ShapeKind; name: string; icon: string }[] = [
  // Icons are drawn on a 40 x 28 box: a back run, plus legs for L and U.
  { shape: 'rectangle', name: 'Straight', icon: 'M2 9 H38 V19 H2 Z' },
  { shape: 'L', name: 'L-Shaped', icon: 'M2 4 H38 V13 H12 V26 H2 Z' },
  { shape: 'U', name: 'U-Shaped', icon: 'M2 4 H38 V26 H28 V13 H12 V26 H2 Z' },
];

export function ShapeTiles({ selected, onPick }: { selected?: ShapeKind; onPick: (shape: ShapeKind) => void }) {
  return (
    <fieldset className="field">
      {/* The "Shape" heading is only read out by screen readers; the tiles speak for themselves. */}
      <legend className={styles.srOnly}>Shape</legend>
      <div className={styles.tiles}>
        {SHAPES.map(({ shape, name, icon }) => (
          <button
            key={shape}
            type="button"
            className={styles.tile}
            aria-pressed={selected === shape}
            aria-label={name}
            title={name}
            onClick={() => onPick(shape)}
          >
            <svg viewBox="0 0 40 28" aria-hidden="true">
              <path d={icon} />
            </svg>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
