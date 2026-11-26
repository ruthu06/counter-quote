// Blue handles on the drawing that change its size: drag (or Tab to one and use the
// arrow keys) and the matching measurement box updates. Values snap to ½".
//
// A drag is measured in screen pixels from where the handle was grabbed, at the zoom it had
// then. So the drawing can keep re-fitting the box while it grows or shrinks, and moving the
// pointer the same distance always changes the size by the same amount.

import { type KeyboardEvent, type PointerEvent, useRef } from 'react';
import { type DimensionField, type Design, clampDimension, fieldLabel, formatInches, resizeHandles } from '../lib/geometry';
import styles from './ResizeHandles.module.css';

/** Arrow keys move a handle 1"; with Shift, 6". */
const KEY_STEP = { normal: 1, shift: 6 };

interface Grab {
  field: DimensionField;
  /** Pointer position (screen pixels) and the measurement when grabbed. */
  startPx: number;
  startValue: number;
  /** Screen pixels per drawing inch when grabbed. */
  pxPerInch: number;
}

interface ResizeHandlesProps {
  design: Design;
  /** Handle size, in drawing inches, so it looks the same on screen at any zoom. */
  radius: number;
  onResize: (field: DimensionField, value: number) => void;
}

export function ResizeHandles({ design, radius, onResize }: ResizeHandlesProps) {
  const grab = useRef<Grab | null>(null);

  const resize = (field: DimensionField, wanted: number) => {
    const value = clampDimension(design, field, wanted);
    if (value !== design[field]) onResize(field, value);
  };

  return (
    <g>
      {resizeHandles(design).map(({ field, at, axis }) => {
        const along = (event: PointerEvent) => (axis === 'x' ? event.clientX : event.clientY);

        const onPointerDown = (event: PointerEvent<SVGCircleElement>) => {
          const ctm = event.currentTarget.ownerSVGElement!.getScreenCTM()!;
          grab.current = { field, startPx: along(event), startValue: design[field], pxPerInch: ctm.a };
          event.currentTarget.setPointerCapture(event.pointerId);
        };
        const onPointerMove = (event: PointerEvent) => {
          const g = grab.current;
          if (g?.field !== field) return;
          resize(field, g.startValue + (along(event) - g.startPx) / g.pxPerInch);
        };
        const release = () => {
          grab.current = null;
        };
        const onKeyDown = (event: KeyboardEvent) => {
          const step = event.shiftKey ? KEY_STEP.shift : KEY_STEP.normal;
          const delta = {
            x: { ArrowRight: step, ArrowLeft: -step },
            y: { ArrowDown: step, ArrowUp: -step },
          }[axis][event.key as 'ArrowRight'];
          if (!delta) return;
          event.preventDefault();
          resize(field, design[field] + delta);
        };

        return (
          <circle
            key={field}
            className={`${styles.handle} ${axis === 'x' ? styles.ew : styles.ns}`}
            cx={at.x}
            cy={at.y}
            r={radius}
            tabIndex={0}
            role="slider"
            aria-label={fieldLabel(design.shape, field)}
            aria-valuenow={design[field]}
            aria-valuetext={formatInches(design[field])}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={release}
            onPointerCancel={release}
            onKeyDown={onKeyDown}
          >
            <title>{`${fieldLabel(design.shape, field)}: ${formatInches(design[field])}. Drag to change it.`}</title>
          </circle>
        );
      })}
    </g>
  );
}
