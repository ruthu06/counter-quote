// Small SVG pieces of the drawing: the grid, wall hatching, lines along edges and edge-length labels.
// All sizes are in inches, like the drawing.

import { type Edge, type Point, CORNER_RADIUS, formatInches } from '../../lib/geometry';
import { COLORS } from './colors';

/** Unit vector pointing out of the counter. Points run clockwise on screen, so it is (dy, -dx). */
function outward(edge: Edge): Point {
  return { x: (edge.to.y - edge.from.y) / edge.length, y: -(edge.to.x - edge.from.x) / edge.length };
}

/** The straight part of an edge: shortened by the corner radius at each rounded end. */
export function straightPart(edge: Edge, trimStart: boolean, trimEnd: boolean): Edge {
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
export function EdgeLine({ edge, color, width }: { edge: Edge; color: string; width: number }) {
  return (
    <line
      x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y}
      stroke={color} strokeWidth={width} strokeLinecap="round" vectorEffect="non-scaling-stroke" pointerEvents="none"
    />
  );
}

/** Hatched strip just outside an edge, showing it sits against a wall. */
export function WallStrip({ edge, depth, fill }: { edge: Edge; depth: number; fill: string }) {
  const n = outward(edge);
  const points = [edge.from, edge.to, { x: edge.to.x + n.x * depth, y: edge.to.y + n.y * depth }, { x: edge.from.x + n.x * depth, y: edge.from.y + n.y * depth }];
  return <polygon points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill={fill} pointerEvents="none" />;
}

/** The diagonal hatching that fills a WallStrip. */
export function WallHatch({ id, size }: { id: string; size: number }) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={size} height={size} patternTransform="rotate(45)">
      <rect width={size} height={size} fill="#eef0f2" />
      <line x1={0} y1={0} x2={0} y2={size} stroke={COLORS.wall} strokeWidth={size * 0.35} />
    </pattern>
  );
}

/** The edge's length in a small box just outside the counter. */
export function EdgeLength({ edge, text }: { edge: Edge; text: number }) {
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

/** 1-foot squares across the whole canvas, lined up with the plan's 0,0. */
export function Grid({ left, top, right, bottom }: { left: number; top: number; right: number; bottom: number }) {
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
