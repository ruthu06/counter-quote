// Edge and corner finishes in the controls panel. Each is one choice for the whole counter:
// edges for every edge not against a wall, corners for every corner that can be rounded.

import type { PricingItem } from '../api';
import { type CornerStyle, type DesignApi, cornerStyle } from '../lib/designState';
import { CORNER_RADIUS, type EdgeProfile } from '../lib/geometry';
import { findPrice } from '../lib/quote';
import styles from './FinishControls.module.css';
import { InfoTip } from './InfoTip';

/** Unfinished isn't offered: it's for wall edges, which are never finished. */
const PROFILES: EdgeProfile[] = ['Eased', 'Beveled', 'Bullnose'];
const CORNER_STYLES: CornerStyle[] = ['Square', 'Rounded'];

/** e.g. "Bullnose (+$15/ft)" or "Eased (included)", from the price list. */
function optionLabel(prices: PricingItem[] | undefined, category: 'Edge' | 'Corner', name: string, unit: string) {
  const item = prices && findPrice(prices, category, name);
  if (!item) return name;
  return item.price > 0 ? `${name} (+$${item.price}/${unit})` : `${name} (included)`;
}

export function FinishControls({ api, prices }: { api: DesignApi; prices?: PricingItem[] }) {
  return (
    <div className={styles.group}>
      {/* First, because it decides which edges are walls and which are finished. */}
      <span className={styles.checkRow}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={api.draft.freestanding}
            onChange={(e) => api.setFreestanding(e.target.checked)}
          />
          Freestanding (island)
        </label>
        <InfoTip label="About freestanding">
          For a piece with no side against a wall, like a kitchen island. Every edge is finished and charged, and every
          outside corner can be rounded.
        </InfoTip>
      </span>

      <div className="field">
        <span className="label-row">
          <label htmlFor="edge-profile">Edges</label>
          <InfoTip label="About edges">
            Applies to every edge that isn’t against a wall. Edges against a wall (hatched on the drawing) are left
            unfinished and aren’t charged.
          </InfoTip>
        </span>
        <select
          id="edge-profile"
          className="control"
          value={api.design.edgeProfile}
          onChange={(e) => api.setExposedEdges(e.target.value as EdgeProfile)}
        >
          {PROFILES.map((p) => (
            <option key={p} value={p}>{optionLabel(prices, 'Edge', p, 'ft')}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <span className="label-row">
          <label htmlFor="corner-style">Corners</label>
          <InfoTip label="About corners">
            <strong>Square</strong> leaves a sharp 90° point. <strong>Rounded</strong> cuts it into a smooth{' '}
            {CORNER_RADIUS}" curve: gentler on hips and small children, and less likely to chip.
          </InfoTip>
        </span>
        <select
          id="corner-style"
          className="control"
          value={cornerStyle(api.design)}
          onChange={(e) => api.setCorners(e.target.value as CornerStyle)}
        >
          {CORNER_STYLES.map((c) => (
            <option key={c} value={c}>{optionLabel(prices, 'Corner', c, 'corner')}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
