// Draws a design as a to-scale plan: grid, counter outline (with any rounded corners),
// dimension lines, edge finishes, the sink and the resize handles.
// SVG units are inches, so the maths matches the geometry exactly.

import { useId, useState } from 'react';
import {
  type Design,
  type DimensionField,
  type Edge,
  type EdgeProfile,
  type Point,
  CORNER_RADIUS,
  cornerArcPath,
  edgeProfile,
  formatInches,
  formatNumber,
  outlinePath,
  roundedCornersOf,
  shapeToPolygon,
  validateDesign,
} from '../lib/geometry';
import styles from './CounterCanvas.module.css';
import { MaterialPattern } from './MaterialPattern';
import { ResizeHandles } from './ResizeHandles';
import { Sink } from './Sink';

const COLORS = {
  grid: '#e3e7ec',
  outline: '#33413b',
  dimension: '#1f2933',
  hover: '#1d5fa8',
  wall: '#8a949e',
};

/** How each paid edge profile is marked on the drawing; Eased is the plain outline, Unfinished a wall strip. */
const PROFILE_COLORS: Partial<Record<EdgeProfile, string>> = {
  Beveled: '#c27c0e',
  Bullnose: '#7b4fc4',
};

/** Rough on-screen size of the canvas (see CounterCanvas.module.css) and the label size we aim for. */
const VIEW_PX = { width: 820, height: 520 };
const LABEL_PX = 15;

interface Dimension {
  from: Point;
  to: Point;
  /** Which side of the line the label sits on. */
  side: 'top' | 'bottom' | 'left' | 'right';
  label: string;
}

interface CounterCanvasProps {
  design: Design;
  /** Makes the sink draggable; called with its new centre. Without it the drawing is display-only. */
  onMoveSink?: (center: Point) => void;
  /** Shows the blue resize handles; called with the measurement and its new value while dragging. */
  onResize?: (field: DimensionField, value: number) => void;
}

/** How the drawing is fitted into the box: the visible area and the text size, in inches. */
interface Fit {
  viewBox: string;
  text: number;
  gap: number;
  margin: number;
  gridBleed: number;
}

export function CounterCanvas({ design, onMoveSink, onResize }: CounterCanvasProps) {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  // Added for scalability: today a page shows one canvas, but SVG ids are global to the page,
  // so if more canvases are added (e.g. previews on the jobs list), each needs its own pattern id
  // or they would all show the first canvas's material. React's ids contain ':', which we strip.
  const patternId = `material-${useId().replace(/:/g, '')}`;
  const wallPatternId = `${patternId}-wall`;

  const errors = validateDesign(design);
  if (errors.length) {
    return (
      <div className={`${styles.canvas} ${styles.empty}`}>
        <p className="muted">Fix the measurements to see the drawing.</p>
      </div>
    );
  }

  const outline = shapeToPolygon(design);
  const width = Math.max(...outline.points.map((p) => p.x));
  const height = Math.max(...outline.points.map((p) => p.y));
  const { viewBox, text, gap, margin, gridBleed } = fitTo(width, height);

  const { dimensions, shownEdgeIds } = mainDimensions(design, outline.edges, gap);
  const hover = outline.edges.find((e) => e.id === hoveredEdge);
  const rounded = roundedCornersOf(design, outline);
  // Edge i runs from corner i to corner i + 1; lines along it stop where a rounded corner's curve starts.
  const straight = (e: Edge) => {
    const i = outline.edges.indexOf(e);
    return straightPart(e, rounded.includes(i), rounded.includes((i + 1) % outline.points.length));
  };

  return (
    <div className={styles.canvas}>
      <svg viewBox={viewBox} role="img" aria-label={`${design.shape} counter plan`}>
        <defs>
          <MaterialPattern id={patternId} material={design.material} />
          <WallHatch id={wallPatternId} size={text * 0.35} />
        </defs>
        {/* The box is rarely the drawing's exact proportions, so draw the grid well past it
            on every side; the SVG's edge clips it, and the grid fills right up to the border. */}
        <Grid
          left={-margin - gridBleed}
          top={-margin - gridBleed}
          right={width + margin + gridBleed}
          bottom={height + margin + gridBleed}
        />
        <path
          d={outlinePath(outline, rounded)}
          fill={`url(#${patternId})`}
          stroke={COLORS.outline}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />

        {/* Edge finishes: a hatched wall strip outside Unfinished edges, a coloured line on paid profiles. */}
        {outline.edges.map((e) => {
          const profile = edgeProfile(design, e);
          if (profile === 'Unfinished') return <WallStrip key={e.id} edge={e} depth={text * 0.45} fill={`url(#${wallPatternId})`} />;
          const color = PROFILE_COLORS[profile];
          return color && <EdgeLine key={e.id} edge={straight(e)} color={color} width={3} />;
        })}
        {/* A rounded corner's curve takes the colour of the edge leading into it (both its edges are exposed). */}
        {rounded.map((i) => {
          const incoming = outline.edges[(i - 1 + outline.points.length) % outline.points.length];
          const color = PROFILE_COLORS[edgeProfile(design, incoming)];
          return (
            color && (
              <path key={`corner-${i}`} d={cornerArcPath(outline, i)} fill="none" stroke={color} strokeWidth={3}
                strokeLinecap="round" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            )
          );
        })}

        {dimensions.map((d) => (
          <DimensionLine key={`${d.side}-${d.label}`} dimension={d} text={text} />
        ))}

        {hover && <EdgeLine edge={straight(hover)} color={COLORS.hover} width={3} />}
        {/* Edges without a dimension line show their length while hovered. */}
        {hover && !shownEdgeIds.has(hover.id) && <EdgeLength edge={hover} text={text} />}

        {/* Wide invisible lines on top, so edges are easy to hover. */}
        {outline.edges.map((e) => (
          <line
            key={e.id}
            x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y}
            stroke="transparent"
            strokeWidth={14}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="stroke"
            onMouseEnter={() => setHoveredEdge(e.id)}
            onMouseLeave={() => setHoveredEdge(null)}
          >
            <title>{`${e.label}: ${formatInches(e.length)}, ${edgeProfile(design, e)}`}</title>
          </line>
        ))}

        {/* Last, so they sit above everything else and can be grabbed. */}
        <Sink design={design} onMove={onMoveSink} />
        {onResize && (
          <ResizeHandles design={design} radius={text * 0.4} onResize={onResize} />
        )}
      </svg>

      <p className={styles.area}>{formatNumber(outline.areaSqFt)} sq. ft.</p>
      <EdgeKey />
      {onResize && (
        <p className={styles.hint}>
          Try dragging the blue handles to resize{onMoveSink && design.sink !== 'None' ? ', or drag the sink to move it' : ''}.
        </p>
      )}
    </div>
  );
}

/**
 * Fits a counter of this size into the box. The SVG scales to fit, so the text size (in inches)
 * is picked to land near LABEL_PX on screen, whatever the counter's size or proportions.
 */
function fitTo(width: number, height: number): Fit {
  const fitScale = Math.min(VIEW_PX.width / (width * 1.3), VIEW_PX.height / (height * 1.3));
  const text = LABEL_PX / fitScale;
  const gap = text * 1.4;
  const margin = gap + text * 1.6;
  return {
    viewBox: `${-margin} ${-margin} ${width + 2 * margin} ${height + 2 * margin}`,
    text,
    gap,
    margin,
    gridBleed: 2 * Math.max(width, height),
  };
}

/** Before a shape is picked: the empty grid and a prompt. */
export function EmptyCanvas() {
  return (
    <div className={styles.canvas}>
      <svg viewBox="0 0 240 152" role="img" aria-label="Empty drawing">
        <Grid left={0} top={0} right={240} bottom={152} />
        <text x={120} y={76} fontSize={8} textAnchor="middle" dominantBaseline="central" fill="#66727f">
          Pick a shape to start
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

/**
 * The measurements needed to cut, always shown, all outside the counter:
 * overall length (top), each outside wall height (left, and right on a U) and the depth once.
 */
function mainDimensions(design: Design, edges: Edge[], gap: number) {
  const edge = (id: string) => edges.find((e) => e.id === id);
  const dimensions: Dimension[] = [];
  const shownEdgeIds = new Set<string>(['back']);

  dimensions.push({ from: { x: 0, y: -gap }, to: { x: design.length, y: -gap }, side: 'top', label: formatInches(design.length) });

  const left = edge('left-wall') ?? edge('left-end')!;
  shownEdgeIds.add(left.id);
  dimensions.push({ from: { x: -gap, y: 0 }, to: { x: -gap, y: left.length }, side: 'left', label: formatInches(left.length) });

  const right = edge('right-wall');
  if (right) {
    shownEdgeIds.add(right.id);
    dimensions.push({ from: { x: design.length + gap, y: 0 }, to: { x: design.length + gap, y: right.length }, side: 'right', label: formatInches(right.length) });
  }

  // On a rectangle the left side already is the depth; on L and U, show it under the left leg.
  const legEnd = edge('left-leg-end');
  if (legEnd) {
    shownEdgeIds.add(legEnd.id);
    const y = legEnd.from.y + gap;
    dimensions.push({ from: { x: 0, y }, to: { x: design.depth, y }, side: 'bottom', label: formatInches(design.depth) });
  }

  return { dimensions, shownEdgeIds };
}

function DimensionLine({ dimension: d, text }: { dimension: Dimension; text: number }) {
  const vertical = d.side === 'left' || d.side === 'right';
  const tick = text * 0.4;
  const ticks = [d.from, d.to].map((p) =>
    vertical ? { x1: p.x - tick, y1: p.y, x2: p.x + tick, y2: p.y } : { x1: p.x, y1: p.y - tick, x2: p.x, y2: p.y + tick },
  );
  const mid = { x: (d.from.x + d.to.x) / 2, y: (d.from.y + d.to.y) / 2 };
  const offset = text * 0.8;
  const label = {
    top: { x: mid.x, y: mid.y - offset, rotate: 0 },
    bottom: { x: mid.x, y: mid.y + offset, rotate: 0 },
    left: { x: mid.x - offset, y: mid.y, rotate: -90 },
    // Both side labels read bottom-to-top, as on a drawing.
    right: { x: mid.x + offset, y: mid.y, rotate: -90 },
  }[d.side];

  return (
    <g stroke={COLORS.dimension} strokeWidth={1} vectorEffect="non-scaling-stroke">
      <line x1={d.from.x} y1={d.from.y} x2={d.to.x} y2={d.to.y} vectorEffect="non-scaling-stroke" />
      {ticks.map((t, i) => (
        <line key={i} {...t} vectorEffect="non-scaling-stroke" />
      ))}
      <text
        x={label.x}
        y={label.y}
        transform={label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined}
        fontSize={text}
        textAnchor="middle"
        dominantBaseline="central"
        fill={COLORS.dimension}
        stroke="none"
      >
        {d.label}
      </text>
    </g>
  );
}

/** Unit vector pointing out of the counter. Points run clockwise on screen, so it is (dy, -dx). */
function outward(edge: Edge): Point {
  return { x: (edge.to.y - edge.from.y) / edge.length, y: -(edge.to.x - edge.from.x) / edge.length };
}

/** The straight part of an edge: shortened by the corner radius at each rounded end. */
function straightPart(edge: Edge, trimStart: boolean, trimEnd: boolean): Edge {
  const ux = (edge.to.x - edge.from.x) / edge.length;
  const uy = (edge.to.y - edge.from.y) / edge.length;
  const start = trimStart ? CORNER_RADIUS : 0;
  const end = trimEnd ? CORNER_RADIUS : 0;
  return {
    ...edge,
    from: { x: edge.from.x + ux * start, y: edge.from.y + uy * start },
    to: { x: edge.to.x - ux * end, y: edge.to.y - uy * end },
    length: edge.length - start - end,
  };
}

/** A line drawn along an edge, e.g. a profile colour or the hover highlight. */
function EdgeLine({ edge, color, width }: { edge: Edge; color: string; width: number }) {
  return (
    <line
      x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y}
      stroke={color} strokeWidth={width} strokeLinecap="round" vectorEffect="non-scaling-stroke" pointerEvents="none"
    />
  );
}

/** Hatched strip just outside an edge, showing it sits against a wall. */
function WallStrip({ edge, depth, fill }: { edge: Edge; depth: number; fill: string }) {
  const n = outward(edge);
  const points = [edge.from, edge.to, { x: edge.to.x + n.x * depth, y: edge.to.y + n.y * depth }, { x: edge.from.x + n.x * depth, y: edge.from.y + n.y * depth }];
  return <polygon points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill={fill} pointerEvents="none" />;
}

function WallHatch({ id, size }: { id: string; size: number }) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={size} height={size} patternTransform="rotate(45)">
      <rect width={size} height={size} fill="#eef0f2" />
      <line x1={0} y1={0} x2={0} y2={size} stroke={COLORS.wall} strokeWidth={size * 0.35} />
    </pattern>
  );
}

/** The edge's length in a small box just outside the counter. */
function EdgeLength({ edge, text }: { edge: Edge; text: number }) {
  const n = outward(edge);
  const x = (edge.from.x + edge.to.x) / 2 + n.x * text;
  const y = (edge.from.y + edge.to.y) / 2 + n.y * text;
  const label = formatInches(edge.length);
  const boxWidth = label.length * text * 0.62 + text * 0.6;

  return (
    <g pointerEvents="none">
      <rect x={x - boxWidth / 2} y={y - text * 0.7} width={boxWidth} height={text * 1.4} rx={text * 0.2} fill="#fff" stroke={COLORS.hover} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <text x={x} y={y} fontSize={text} textAnchor="middle" dominantBaseline="central" fill={COLORS.hover}>
        {label}
      </text>
    </g>
  );
}

/** 1-foot squares across the whole canvas, lined up with the counter's back-left corner. */
function Grid({ left, top, right, bottom }: { left: number; top: number; right: number; bottom: number }) {
  const lines = [];
  for (let x = Math.ceil(left / 12) * 12; x <= right; x += 12) lines.push({ x1: x, y1: top, x2: x, y2: bottom });
  for (let y = Math.ceil(top / 12) * 12; y <= bottom; y += 12) lines.push({ x1: left, y1: y, x2: right, y2: y });
  return (
    <g stroke={COLORS.grid} strokeWidth={1} vectorEffect="non-scaling-stroke">
      {lines.map((l, i) => (
        <line key={i} {...l} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
}
