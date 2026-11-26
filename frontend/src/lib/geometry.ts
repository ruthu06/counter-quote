// Turns a counter's measurements into an outline: corner points, edges and area.
// All lengths are in inches. Coordinates: x grows to the right, y grows toward
// the front of the room, (0, 0) is the back-left corner of the counter.

export type ShapeKind = 'rectangle' | 'L' | 'U';
export type Material = 'Granite' | 'Quartz' | 'Marble';
/** Material grade: 1 Standard, 2 Premium, 3 Luxury. Rarer stones with bolder patterns cost more. */
export type Grade = 1 | 2 | 3;
export type EdgeProfile = 'Unfinished' | 'Eased' | 'Beveled' | 'Bullnose';
export type SinkType = 'None' | 'Drop-in' | 'Undermount';

export interface Design {
  material: Material;
  grade: Grade;
  /** The profile of every exposed edge. Edges against a wall are always Unfinished. */
  edgeProfile: EdgeProfile;
  /** True: every corner that can be rounded is (see roundableCorners). False: all square. */
  roundedCorners: boolean;
  sink: SinkType;
  /** Where the user dragged the sink (its centre, in inches). Visual only; not set until moved. */
  sinkCenter?: Point;
  shape: ShapeKind;
  /** Overall length of the back run. */
  length: number;
  /** Front-to-back depth; the same for the back run and the legs. */
  depth: number;
  /** How far the left leg comes forward past the back run's depth (L and U). */
  leftExtension: number;
  /** How far the right leg comes forward past the back run's depth (U only). */
  rightExtension: number;
  /**
   * True for a piece with no side against a wall, e.g. a kitchen island: every edge is finished
   * (and charged) and every outside corner can be rounded. False: the back and side walls stay unfinished.
   */
  freestanding: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface Edge {
  /** Stays the same while dimensions change, so edge choices can be keyed by it. */
  id: string;
  label: string;
  from: Point;
  to: Point;
  length: number;
  /** Default only: wall edges start Unfinished, exposed edges start Eased. */
  againstWall: boolean;
}

export interface Outline {
  /** Clockwise, starting at the back-left corner. */
  points: Point[];
  /** edges[i] runs from points[i] to points[i + 1]. */
  edges: Edge[];
  areaSqFt: number;
}

const SQ_IN_PER_SQ_FT = 144;

/** An edge's profile: Unfinished against a wall, otherwise the design's chosen profile. */
export function edgeProfile(design: Design, edge: Edge): EdgeProfile {
  return edge.againstWall ? 'Unfinished' : design.edgeProfile;
}

export type DimensionField = 'length' | 'depth' | 'leftExtension' | 'rightExtension';

/**
 * Sensible ranges in inches, so a typo (1200 instead of 120) is caught rather than drawn.
 * Depth: 12" is a narrow ledge, 48" a deep island. Length: 25 ft is longer than any single run we quote.
 */
export const LIMITS: Record<DimensionField, { min: number; max: number }> = {
  length: { min: 12, max: 300 },
  depth: { min: 12, max: 48 },
  leftExtension: { min: 1, max: 240 },
  rightExtension: { min: 1, max: 240 },
};

/** The fields the shape actually uses; the others are ignored. */
export function fieldsFor(shape: ShapeKind): DimensionField[] {
  if (shape === 'rectangle') return ['length', 'depth'];
  if (shape === 'L') return ['length', 'depth', 'leftExtension'];
  return ['length', 'depth', 'leftExtension', 'rightExtension'];
}

/** What a field is called on screen; on an L there is just one extension. */
export function fieldLabel(shape: ShapeKind, field: DimensionField): string {
  if (field === 'leftExtension') return shape === 'L' ? 'Extension' : 'Left Extension';
  return { length: 'Length', depth: 'Depth', rightExtension: 'Right Extension' }[field];
}

/** One message per field that is wrong, so each can show under its own input. */
export function fieldErrors(d: Design): Partial<Record<DimensionField, string>> {
  const errors: Partial<Record<DimensionField, string>> = {};
  for (const field of fieldsFor(d.shape)) {
    const { min, max } = LIMITS[field];
    // Written as !(in range) so an empty or non-numeric entry (NaN) also fails.
    if (!(d[field] >= min && d[field] <= max)) {
      errors[field] = `${fieldLabel(d.shape, field)} must be ${min}–${max} in.`;
    }
  }
  // Only when Length and Depth are each fine on their own (errors['length'] is the Length box's message).
  if (!errors['length'] && !errors['depth']) {
    if (d.shape === 'L' && !(d.length > d.depth)) errors.length = 'Length must be more than the depth for an L.';
    if (d.shape === 'U' && !(d.length > 2 * d.depth)) errors.length = 'Length must be more than twice the depth for a U.';
  }
  return errors;
}

/** Problems that would make the shape impossible to draw; empty when the design is valid. */
export function validateDesign(d: Design): string[] {
  return Object.values(fieldErrors(d)).filter((e): e is string => !!e);
}

export function shapeToPolygon(d: Design): Outline {
  const { length: L, depth: D } = d;
  const a = d.leftExtension;
  const b = d.rightExtension;

  // Each corner is listed with the edge that leaves it toward the next corner.
  let corners: [Point, string, string, boolean][];
  switch (d.shape) {
    case 'rectangle':
      corners = [
        [{ x: 0, y: 0 }, 'back', 'Back', true],
        [{ x: L, y: 0 }, 'right-end', 'Right end', false],
        [{ x: L, y: D }, 'front', 'Front', false],
        [{ x: 0, y: D }, 'left-end', 'Left end', false],
      ];
      break;
    case 'L':
      corners = [
        [{ x: 0, y: 0 }, 'back', 'Back', true],
        [{ x: L, y: 0 }, 'right-end', 'Right end', false],
        [{ x: L, y: D }, 'front', 'Front', false],
        [{ x: D, y: D }, 'left-leg-inner', 'Left leg inside', false],
        [{ x: D, y: D + a }, 'left-leg-end', 'Left leg end', false],
        [{ x: 0, y: D + a }, 'left-wall', 'Left wall', true],
      ];
      break;
    case 'U':
      corners = [
        [{ x: 0, y: 0 }, 'back', 'Back', true],
        [{ x: L, y: 0 }, 'right-wall', 'Right wall', true],
        [{ x: L, y: D + b }, 'right-leg-end', 'Right leg end', false],
        [{ x: L - D, y: D + b }, 'right-leg-inner', 'Right leg inside', false],
        [{ x: L - D, y: D }, 'front', 'Front', false],
        [{ x: D, y: D }, 'left-leg-inner', 'Left leg inside', false],
        [{ x: D, y: D + a }, 'left-leg-end', 'Left leg end', false],
        [{ x: 0, y: D + a }, 'left-wall', 'Left wall', true],
      ];
      break;
  }

  const points = corners.map(([p]) => p);
  const edges: Edge[] = corners.map(([from, id, label, wallSide], i) => {
    const to = points[(i + 1) % points.length];
    // A freestanding piece (an island) touches no wall, so none of its edges is a wall edge.
    const againstWall = wallSide && !d.freestanding;
    return { id, label, from, to, length: Math.hypot(to.x - from.x, to.y - from.y), againstWall };
  });

  return { points, edges, areaSqFt: polygonArea(points) / SQ_IN_PER_SQ_FT };
}

/** How much room a countertop takes up: its width and height, in inches. */
export function sizeOf(d: Design): { width: number; height: number } {
  const { points } = shapeToPolygon(d);
  return { width: Math.max(...points.map((p) => p.x)), height: Math.max(...points.map((p) => p.y)) };
}

/** Gap left when a new countertop is placed beside the others, in inches. */
const PIECE_GAP = 24;

/** A countertop placed on the plan: its design, and where its top-left corner sits (inches). */
export interface Placed {
  design: Design;
  at: Point;
}

/**
 * Whether two placed countertops overlap: any run of one crosses any run of the other.
 * Touching edge to edge isn't an overlap.
 */
export function overlaps(a: Placed, b: Placed): boolean {
  return runs(a.design).some((ra) =>
    runs(b.design).some(
      (rb) =>
        a.at.x + ra.x0 < b.at.x + rb.x1 &&
        b.at.x + rb.x0 < a.at.x + ra.x1 &&
        a.at.y + ra.y0 < b.at.y + rb.y1 &&
        b.at.y + rb.y0 < a.at.y + ra.y1,
    ),
  );
}

/** Where a newly drawn countertop goes: to the right of the others, with a gap, on a whole foot. */
export function placeAfter(others: Placed[]): Point {
  if (!others.length) return { x: 0, y: 0 };
  const right = Math.max(...others.map((o) => o.at.x + sizeOf(o.design).width));
  return { x: Math.ceil((right + PIECE_GAP) / 12) * 12, y: Math.min(...others.map((o) => o.at.y)) };
}

/** A fresh design when a shape is first picked: the sizes from the design mock, no extras chosen yet. */
export function newDesign(shape: ShapeKind, material: Material): Design {
  return {
    shape,
    length: 120,
    depth: 24,
    leftExtension: 60,
    rightExtension: 60,
    material,
    grade: 1,
    edgeProfile: 'Eased',
    roundedCorners: false,
    sink: 'None',
    freestanding: false,
  };
}

/** A blue handle on the drawing: drag it along `axis` to change `field`. */
export interface ResizeHandle {
  field: DimensionField;
  at: Point;
  axis: 'x' | 'y';
}

/**
 * Where the resize handles sit: the right end (length), the front edge (depth) and the end of
 * each leg (extensions). The depth handle sits three-quarters along the front, clear of where
 * the sink starts (the middle).
 */
export function resizeHandles(d: Design): ResizeHandle[] {
  const { length: L, depth: D } = d;
  // The front edge of the back run, between the legs (or the whole front of a rectangle).
  const frontFrom = d.shape === 'U' ? L - D : L;
  const frontTo = d.shape === 'rectangle' ? 0 : D;
  const handles: ResizeHandle[] = [
    { field: 'length', at: { x: L, y: D / 2 }, axis: 'x' },
    { field: 'depth', at: { x: frontFrom - (frontFrom - frontTo) * 0.25, y: D }, axis: 'y' },
  ];
  if (d.shape !== 'rectangle') handles.push({ field: 'leftExtension', at: { x: D / 2, y: D + d.leftExtension }, axis: 'y' });
  if (d.shape === 'U') handles.push({ field: 'rightExtension', at: { x: L - D / 2, y: D + d.rightExtension }, axis: 'y' });
  return handles;
}

/** Drag steps snap to half an inch: fine enough for a quote, easy to land on. */
const SNAP = 0.5;

/**
 * A wanted value snapped to ½" and kept to a size the shape can draw:
 * within LIMITS, an L longer than it is deep, a U longer than twice its depth.
 */
export function clampDimension(d: Design, field: DimensionField, raw: number): number {
  let { min, max } = LIMITS[field];
  if (field === 'length' && d.shape === 'L') min = Math.max(min, d.depth + SNAP);
  if (field === 'length' && d.shape === 'U') min = Math.max(min, 2 * d.depth + SNAP);
  if (field === 'depth' && d.shape === 'L') max = Math.min(max, d.length - SNAP);
  if (field === 'depth' && d.shape === 'U') max = Math.min(max, (d.length - SNAP) / 2);
  const snapped = Math.round(raw / SNAP) * SNAP;
  return Math.min(Math.floor(max / SNAP) * SNAP, Math.max(Math.ceil(min / SNAP) * SNAP, snapped));
}

/** A standard single-bowl sink, in inches: long side along the run, short side front to back. */
const SINK_SIZE = { long: 30, short: 18 };
/** Stone left around the cutout so it doesn't crack, in inches. */
const SINK_MARGIN = 3;

export interface SinkPlacement {
  center: Point;
  width: number;
  height: number;
}

/**
 * The straight runs a countertop is made of, each a rectangle: the back run, plus a leg for L and U.
 * Used to place the sink (it lines up with its run, so in a leg it turns to run front to back)
 * and to tell whether two countertops overlap.
 */
export function runs(d: Design): { x0: number; y0: number; x1: number; y1: number; alongX: boolean }[] {
  const back = { x0: 0, y0: 0, x1: d.length, y1: d.depth, alongX: true };
  const left = { x0: 0, y0: 0, x1: d.depth, y1: d.depth + d.leftExtension, alongX: false };
  const right = { x0: d.length - d.depth, y0: 0, x1: d.length, y1: d.depth + d.rightExtension, alongX: false };
  if (d.shape === 'L') return [back, left];
  if (d.shape === 'U') return [back, left, right];
  return [back];
}

/**
 * Where the sink is drawn: as close as possible to where it was dragged (or the middle of the
 * back run), but always wholly inside one run with a margin of stone around it. Shrinks to fit
 * a very small counter.
 */
export function placeSink(d: Design): SinkPlacement {
  const wanted = d.sinkCenter ?? { x: d.length / 2, y: d.depth / 2 };
  let best: (SinkPlacement & { distance: number }) | undefined;
  for (const run of runs(d)) {
    const runLong = run.alongX ? run.x1 - run.x0 : run.y1 - run.y0;
    const long = Math.max(1, Math.min(SINK_SIZE.long, runLong - 2 * SINK_MARGIN));
    const short = Math.max(1, Math.min(SINK_SIZE.short, d.depth - 2 * SINK_MARGIN));
    const width = run.alongX ? long : short;
    const height = run.alongX ? short : long;
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
    const center = {
      x: clamp(wanted.x, run.x0 + SINK_MARGIN + width / 2, run.x1 - SINK_MARGIN - width / 2),
      y: clamp(wanted.y, run.y0 + SINK_MARGIN + height / 2, run.y1 - SINK_MARGIN - height / 2),
    };
    const distance = Math.hypot(center.x - wanted.x, center.y - wanted.y);
    if (!best || distance < best.distance - 1e-9) best = { center, width, height, distance };
  }
  const { center, width, height } = best!;
  return { center, width, height };
}

/** Radius of a rounded corner, in inches. One fixed size, priced as a flat fee per corner. */
export const CORNER_RADIUS = 3;

/**
 * Corners that can be rounded: outside corners where both edges are exposed.
 * A corner touching a wall can't be (the stone meets the wall), nor can the inside corner of an L or U.
 * Corner i is outline.points[i], where edges[i - 1] arrives and edges[i] leaves.
 */
export function roundableCorners(outline: Outline): number[] {
  const n = outline.points.length;
  return outline.points.flatMap((_, i) => {
    const incoming = outline.edges[(i - 1 + n) % n];
    const outgoing = outline.edges[i];
    const a = { x: incoming.to.x - incoming.from.x, y: incoming.to.y - incoming.from.y };
    const b = { x: outgoing.to.x - outgoing.from.x, y: outgoing.to.y - outgoing.from.y };
    // Points run clockwise on screen, so a positive turn means an outside corner.
    const outside = a.x * b.y - a.y * b.x > 0;
    return outside && !incoming.againstWall && !outgoing.againstWall ? [i] : [];
  });
}

/** The corners drawn and charged as rounded: all that can be, when the design asks for rounded corners. */
export function roundedCornersOf(design: Design, outline: Outline): number[] {
  return design.roundedCorners ? roundableCorners(outline) : [];
}

/** Where a rounded corner's curve starts (on the incoming edge) and ends (on the outgoing edge). */
function cornerArcEnds(outline: Outline, i: number): { start: Point; end: Point } {
  const n = outline.points.length;
  const p = outline.points[i];
  const toward = (q: Point) => {
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    return { x: p.x + ((q.x - p.x) / d) * CORNER_RADIUS, y: p.y + ((q.y - p.y) / d) * CORNER_RADIUS };
  };
  return { start: toward(outline.points[(i - 1 + n) % n]), end: toward(outline.points[(i + 1) % n]) };
}

// Sweep flag 1: the arc turns clockwise, the same way the outline runs.
const arcTo = (end: Point) => `A ${CORNER_RADIUS} ${CORNER_RADIUS} 0 0 1 ${end.x} ${end.y}`;

/** SVG path of the outline, with an arc of CORNER_RADIUS at each rounded corner. */
export function outlinePath(outline: Outline, rounded: number[]): string {
  return (
    outline.points
      .map((p, i) => {
        const move = i === 0 ? 'M' : 'L';
        if (!rounded.includes(i)) return `${move} ${p.x} ${p.y}`;
        const { start, end } = cornerArcEnds(outline, i);
        return `${move} ${start.x} ${start.y} ${arcTo(end)}`;
      })
      .join(' ') + ' Z'
  );
}

/** SVG path of just one rounded corner's curve, e.g. to colour it like its edges. */
export function cornerArcPath(outline: Outline, i: number): string {
  const { start, end } = cornerArcEnds(outline, i);
  return `M ${start.x} ${start.y} ${arcTo(end)}`;
}

/** One decimal at most, and none when it would be .0: 30, 14.8, 25.5. */
export function formatNumber(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export const formatInches = (inches: number) => `${formatNumber(inches)}"`;

/** Shoelace formula: area of any simple polygon, so new shapes need no special case. */
function polygonArea(points: Point[]): number {
  let twiceArea = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    twiceArea += p.x * q.y - q.x * p.y;
  });
  return Math.abs(twiceArea) / 2;
}
