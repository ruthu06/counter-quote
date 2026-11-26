// Material, then its grade level (Standard / Premium / Luxury) with the price for each,
// and a short description of what that grade looks like.

import type { PricingItem } from '../api';
import type { useDesign } from '../hooks/useDesign';
import { GRADES, GRADE_DESCRIPTIONS, MATERIALS, isMaterial, materialPriceName } from '../lib/materials';
import { findPrice } from '../lib/quote';
import { InfoTip } from './InfoTip';
import styles from './MaterialPicker.module.css';

type DesignApi = ReturnType<typeof useDesign>;

export function MaterialPicker({ api, prices }: { api: DesignApi; prices?: PricingItem[] }) {
  const { material, grade } = api.draft;

  return (
    <div className={styles.picker}>
      <span className={styles.labelRow}>
        <label htmlFor="material" className={styles.label}>Material</label>
        <InfoTip label="About materials and grades">
          Prices are per square foot, installed: the slab, cutting and fitting. Within each material, higher grades are
          rarer stones with bolder patterns.
        </InfoTip>
      </span>
      <select
        id="material"
        className={styles.select}
        value={material}
        onChange={(e) => isMaterial(e.target.value) && api.setMaterial(e.target.value)}
      >
        {MATERIALS.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>

      <fieldset className={styles.grades}>
        <legend className={styles.legend}>Grade level</legend>
        {GRADES.map((g) => {
          const price = prices && findPrice(prices, 'Material', materialPriceName(material, g.level))?.price;
          return (
            <label key={g.level} className={styles.grade}>
              <input
                type="radio"
                name="grade"
                value={g.level}
                checked={grade === g.level}
                onChange={() => api.setGrade(g.level)}
              />
              <span>{g.name}</span>
              {price !== undefined && <span className={styles.price}>${price}/ft²</span>}
            </label>
          );
        })}
      </fieldset>

      {/* What the chosen grade looks like, so the price difference makes sense. */}
      <div className={styles.description} aria-live="polite">
        <strong>
          {material} · Level {grade}
        </strong>
        <span>{GRADE_DESCRIPTIONS[material][grade]}</span>
      </div>
    </div>
  );
}
