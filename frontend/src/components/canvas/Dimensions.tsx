// The dimension lines on the selected countertop: which measurements are shown, and how each is drawn.

import { type Design, type Edge, type Point, formatInches } from '../../lib/geometry';
import { COLORS } from './colors';

interface Dimension {
  from: Point;
  to: Point;
  /** Which side of the line the label sits on. */
  side: 'top' | 'bottom' | 'left' | 'right';
  label: string;
}

/**
 * The measurements needed to cut, always shown, all outside the counter:
 * overall length (top), each outside wall height (left, and right on a U) and the depth once.
 * shownEdgeIds are the edges these cover; the others show their length on hover instead.
 */
export function mainDimensions(design: Design, edges: Edge[], gap: number) {
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

/** One dimension: a line with end ticks and its measurement beside it. */
export function DimensionLine({ dimension: d, text }: { dimension: Dimension; text: number }) {
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
