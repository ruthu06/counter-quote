// Edge and corner finishes in the controls panel. Each is one choice for the whole counter:
// edges for every edge not against a wall, corners for every corner that can be rounded.

import type { PricingItem } from '../api';
import { type CornerStyle, type useDesign, cornerStyle, exposedProfile } from '../hooks/useDesign';
import { CORNER_RADIUS, type EdgeProfile } from '../lib/geometry';
import { findPrice } from '../lib/quote';
import styles from './FinishControls.module.css';
import { InfoTip } from './InfoTip';

type DesignApi = ReturnType<typeof useDesign>;

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
      <div className={styles.field}>
        <span className={styles.labelRow}>
          <label htmlFor="edge-profile">Edges</label>
          <InfoTip label="About edges">
            Applies to every edge that isn’t against a wall. Edges against a wall (hatched on the drawing) are left
            unfinished and aren’t charged.
          </InfoTip>
        </span>
        <select
          id="edge-profile"
          value={exposedProfile(api.design)}
          onChange={(e) => api.setExposedEdges(e.target.value as EdgeProfile)}
        >
          {PROFILES.map((p) => (
            <option key={p} value={p}>{optionLabel(prices, 'Edge', p, 'ft')}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <span className={styles.labelRow}>
          <label htmlFor="corner-style">Corners</label>
          <InfoTip label="About corners">
            <strong>Square</strong> leaves a sharp 90° point. <strong>Rounded</strong> cuts it into a smooth{' '}
            {CORNER_RADIUS}" curve: gentler on hips and small children, and less likely to chip.
          </InfoTip>
        </span>
        <select
          id="corner-style"
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
