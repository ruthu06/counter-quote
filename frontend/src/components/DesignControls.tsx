// Customization of the selected countertop: measurements, material and grade, and sink.
// Form styles (.field, .control, .field-error, .label-row) are shared, from index.css.

import type { PricingItem } from '../api';
import type { DesignApi } from '../lib/designState';
import { type DimensionField, type SinkType, LIMITS, fieldLabel, fieldsFor } from '../lib/geometry';
import { findPrice } from '../lib/quote';
import styles from './DesignControls.module.css';
import { InfoTip } from './InfoTip';
import { MaterialPicker } from './MaterialPicker';

const SINKS: SinkType[] = ['None', 'Drop-in', 'Undermount'];

/** e.g. "Undermount (+$250)", from the price list; just the name while prices load or for None. */
function sinkLabel(sink: SinkType, prices?: PricingItem[]) {
  const price = prices && findPrice(prices, 'Sink', sink)?.price;
  return price ? `${sink} (+$${price})` : sink;
}

export function DesignControls({ api, prices }: { api: DesignApi; prices?: PricingItem[] }) {
  const { draft, inputs, errors } = api;
  const extensions = fieldsFor(draft.shape).filter((f) => f === 'leftExtension' || f === 'rightExtension');
  // For the extensions tip's example; falls back while the depth box is being retyped.
  const depth = draft.depth > 0 ? draft.depth : 24;
  const input = (field: DimensionField, label: string | undefined) => (
    <DimensionInput
      key={field}
      field={field}
      label={label}
      accessibleName={`${fieldLabel(draft.shape, field)} (inches)`}
      value={inputs[field]}
      invalid={!!errors[field]}
      onChange={(text) => api.setDimension(field, text)}
    />
  );

  return (
    <div className={styles.controls}>
      <div className="field">
        <div className={styles.row}>
          {input('length', 'Length (in)')}
          {input('depth', 'Depth (in)')}
        </div>
        <RowErrors fields={['length', 'depth']} errors={errors} />
      </div>

      {extensions.length > 0 && (
        <fieldset className="field">
          <legend>
            <span className="label-row">
              {extensions.length > 1 ? 'Extensions (in)' : 'Extension (in)'}
              <InfoTip label="About extensions">
                How far each leg comes out past the {depth}" depth of the back run. For example, a leg that measures{' '}
                {depth + 60}" along the wall is a 60" extension.
              </InfoTip>
            </span>
          </legend>
          <div className={styles.row}>
            {extensions.length > 1
              ? [input('leftExtension', 'Left'), input('rightExtension', 'Right')]
              : input('leftExtension', undefined)}
          </div>
          <RowErrors fields={extensions} errors={errors} />
        </fieldset>
      )}

      <hr />

      <MaterialPicker api={api} prices={prices} />

      <hr />

      <div className="field">
        <span className="label-row">
          <label htmlFor="sink-type">Sink</label>
          <InfoTip label="About sinks">
            <strong>Undermount</strong> fits under the stone, so crumbs wipe straight in and there’s no rim to clean
            around. The cut edge has to be polished, so it costs more.
            <br />
            <br />
            <strong>Drop-in</strong> rests on top of the stone by its rim. Quicker to cut and fit, but the rim shows and
            collects grime.
          </InfoTip>
        </span>
        <select id="sink-type" className="control" value={draft.sink} onChange={(e) => api.setSink(e.target.value as SinkType)}>
          {SINKS.map((s) => (
            <option key={s} value={s}>{sinkLabel(s, prices)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** One measurement box. The label is optional: a lone extension box is named by its group heading. */
function DimensionInput(props: {
  field: DimensionField;
  label?: string;
  accessibleName: string;
  value: string;
  invalid: boolean;
  onChange: (text: string) => void;
}) {
  const { field, label, accessibleName, value, invalid, onChange } = props;
  return (
    <label className="field">
      {label}
      <input
        // Text, not type="number": keeps exactly what was typed and avoids scroll-wheel changes.
        type="text"
        inputMode="decimal"
        className="control"
        value={value}
        aria-label={accessibleName}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${field}-message` : undefined}
        placeholder={`${LIMITS[field].min}–${LIMITS[field].max}`}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Errors for a row of boxes, shown under the whole row so they have room to read. */
function RowErrors({ fields, errors }: { fields: DimensionField[]; errors: Partial<Record<DimensionField, string>> }) {
  return (
    <>
      {fields.map(
        (f) =>
          errors[f] && (
            <span key={f} id={`${f}-message`} className="field-error">
              {errors[f]}
            </span>
          ),
      )}
    </>
  );
}
