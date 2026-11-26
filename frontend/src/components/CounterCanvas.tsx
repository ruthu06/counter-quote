// Draws a job's countertops as a to-scale plan, each where it's been placed. All are drawn in
// their real stone and finishes; the selected one also shows dimensions, the draggable sink and
// the resize handles. Countertops can be clicked to select and dragged to move.
// SVG units are inches, so the maths matches the geometry exactly. The parts live in ./canvas.

import { useId } from 'react';
import {
  type Design,
  type DimensionField,
  type Point,
  formatNumber,
  overlaps,
  shapeToPolygon,
  sizeOf,
  validateDesign,
} from '../lib/geometry';
import { COLORS, PROFILE_COLORS } from './canvas/colors';
import { type CanvasPiece, MovablePiece, Piece } from './canvas/Piece';
import { Grid, WallHatch } from './canvas/svgParts';
import styles from './CounterCanvas.module.css';
import { MaterialPattern } from './MaterialPattern';

export type { CanvasPiece };

/** Rough on-screen size of the canvas (see CounterCanvas.module.css) and the label size we aim for. */
const VIEW_PX = { width: 820, height: 520 };
const LABEL_PX = 15;

interface CounterCanvasProps {
  /** Every countertop that has a shape. The selected one also shows dimensions and handles. */
  pieces: CanvasPiece[];
  selectedId: string | null;
  /** Clicking (or starting to drag) a countertop selects it. */
  onSelect?: (id: string) => void;
  /** Makes countertops draggable; called with the new top-left corner while dragging. */
  onMovePiece?: (id: string, to: Point) => void;
  /** Makes the selected countertop's sink draggable; called with its new centre. */
  onMoveSink?: (center: Point) => void;
  /** Shows the selected countertop's blue resize handles; called with the measurement and its new value. */
  onResize?: (field: DimensionField, value: number) => void;
  /** Shown over the drawing, e.g. when the selected countertop has no shape yet. */
  message?: string;
}

/** How the drawing is fitted into the box: the visible area and the text size, in inches. */
interface Fit {
  viewBox: string;
  text: number;
  gap: number;
  margin: number;
  gridBleed: number;
}

export function CounterCanvas(props: CounterCanvasProps) {
  const { pieces, selectedId, onSelect, onMovePiece, onMoveSink, onResize, message } = props;
  // Added for scalability: SVG ids are global to the page, so every countertop (and every
  // canvas) needs its own pattern id. React's ids contain ':', which we strip.
  const baseId = `plan-${useId().replace(/:/g, '')}`;
  const wallPatternId = `${baseId}-wall`;

  const selected = pieces.find((p) => p.id === selectedId);
  if (selected && validateDesign(selected.design).length) {
    return (
      <div className={`${styles.canvas} ${styles.empty}`}>
        <p className="muted">Fix the measurements to see the drawing.</p>
      </div>
    );
  }

  // The area all countertops cover, wherever they've been dragged; the zoom fits all of it.
  const left = Math.min(...pieces.map((p) => p.position.x));
  const top = Math.min(...pieces.map((p) => p.position.y));
  const right = Math.max(...pieces.map((p) => p.position.x + sizeOf(p.design).width));
  const bottom = Math.max(...pieces.map((p) => p.position.y + sizeOf(p.design).height));
  const { viewBox, text, gap, margin, gridBleed } = fitTo(left, top, right - left, bottom - top);

  const clashes = overlapping(pieces);
  const clashing = new Set(clashes.flatMap(([a, b]) => [a.id, b.id]));

  return (
    <div className={styles.canvas}>
      <svg viewBox={viewBox} role="group" aria-label="Countertop plan">
        <defs>
          {pieces.map((p) => (
            <MaterialPattern key={p.id} id={`${baseId}-${p.id}`} material={p.design.material} />
          ))}
          <WallHatch id={wallPatternId} size={text * 0.35} />
        </defs>
        {/* The box is rarely the drawing's exact proportions, so draw the grid well past it
            on every side; the SVG's edge clips it, and the grid fills right up to the border. */}
        <Grid left={left - margin - gridBleed} top={top - margin - gridBleed} right={right + margin + gridBleed} bottom={bottom + margin + gridBleed} />

        {/* The selected countertop goes last, so its dimensions, sink and handles sit on top. */}
        {[...pieces.filter((p) => p.id !== selectedId), ...(selected ? [selected] : [])].map((piece) => (
          <MovablePiece
            key={piece.id}
            piece={piece}
            selected={piece.id === selectedId}
            onSelect={onSelect}
            onMove={onMovePiece}
          >
            <Piece
              design={piece.design}
              selected={piece.id === selectedId}
              name={piece.name}
              clash={clashing.has(piece.id)}
              text={text}
              gap={gap}
              fill={`url(#${baseId}-${piece.id})`}
              wallFill={`url(#${wallPatternId})`}
              onMoveSink={piece.id === selectedId ? onMoveSink : undefined}
              onResize={piece.id === selectedId ? onResize : undefined}
            />
          </MovablePiece>
        ))}

        {message && (
          <text x={(left + right) / 2} y={(top + bottom) / 2} fontSize={text * 1.2} textAnchor="middle" dominantBaseline="central" fill="#66727f">
            {message}
          </text>
        )}
      </svg>

      {clashes.map(([a, b]) => (
        <p key={`${a.id}-${b.id}`} className={styles.clash} role="alert">
          {a.name || 'A countertop'} overlaps {b.name || 'another countertop'}. Drag one of them apart.
        </p>
      ))}
      {selected && <p className={styles.area}>{formatNumber(shapeToPolygon(selected.design).areaSqFt)} sq. ft.</p>}
      {selected && <EdgeKey />}
      <p className={styles.hint}>{hint(selected?.design, pieces.length, !!onResize, !!onMoveSink, !!onMovePiece)}</p>
    </div>
  );
}

/** Pairs of countertops that overlap on the plan. */
function overlapping(pieces: CanvasPiece[]): [CanvasPiece, CanvasPiece][] {
  return pieces.flatMap((a, i) =>
    pieces
      .slice(i + 1)
      .filter((b) => overlaps({ design: a.design, at: a.position }, { design: b.design, at: b.position }))
      .map((b): [CanvasPiece, CanvasPiece] => [a, b]),
  );
}

/** What the user can do on the drawing right now. */
function hint(selected: Design | undefined, count: number, canResize: boolean, canMoveSink: boolean, canMove: boolean): string {
  const tips = [];
  if (selected && canResize) tips.push('drag the blue handles to resize');
  if (selected && canMoveSink && selected.sink !== 'None') tips.push('drag the sink to move it');
  if (canMove) tips.push(count > 1 ? 'drag a countertop to move it, or click one to edit it' : 'drag the countertop to move it');
  return tips.length ? `Try: ${tips.join(', ')}.` : '';
}

/**
 * Fits the plan into the box. The SVG scales to fit, so the text size (in inches) is picked to
 * land near LABEL_PX on screen, whatever the plan's size or proportions.
 */
function fitTo(left: number, top: number, width: number, height: number): Fit {
  const fitScale = Math.min(VIEW_PX.width / (width * 1.3), VIEW_PX.height / (height * 1.3));
  const text = LABEL_PX / fitScale;
  const gap = text * 1.4;
  const margin = gap + text * 1.6;
  return {
    viewBox: `${left - margin} ${top - margin} ${width + 2 * margin} ${height + 2 * margin}`,
    text,
    gap,
    margin,
    gridBleed: 2 * Math.max(width, height),
  };
}

/** Before there's a drawing: the empty grid and a prompt, e.g. "Add a countertop to start". */
export function EmptyCanvas({ message }: { message: string }) {
  return (
    <div className={styles.canvas}>
      <svg viewBox="0 0 240 152" role="img" aria-label="Empty drawing">
        <Grid left={0} top={0} right={240} bottom={152} />
        <text x={120} y={76} fontSize={8} textAnchor="middle" dominantBaseline="central" fill="#66727f">
          {message}
        </text>
      </svg>
    </div>
  );
}

/** What the edge markings mean. */
function EdgeKey() {
  return (
    <ul className={styles.key} aria-label="Edge key">
      <li><span className={styles.swatch} style={{ background: COLORS.outline, height: 2 }} />Eased</li>
      <li><span className={styles.swatch} style={{ background: PROFILE_COLORS.Beveled }} />Beveled</li>
      <li><span className={styles.swatch} style={{ background: PROFILE_COLORS.Bullnose }} />Bullnose</li>
      <li><span className={`${styles.swatch} ${styles.wallSwatch}`} />Wall (unfinished)</li>
    </ul>
  );
}
