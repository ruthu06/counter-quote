// A job's countertops, and turning them into the JSON saved on the job (Job.designJson) and back.
// Reading checks every field: a countertop with anything missing or unexpected is left out,
// so bad or hand-edited data never breaks the page.

import type { Design, EdgeProfile, Grade, Point, ShapeKind, SinkType } from './geometry';
import { isMaterial } from './materials';

/**
 * One countertop in a job: a stable id (for React keys and selection), a name, its design, and
 * where it sits on the plan. The design is null until a shape is picked (a blank canvas); the
 * position is set when it's first drawn and changes when it's dragged.
 */
export interface Countertop {
  id: string;
  name: string;
  design: Design | null;
  /** Top-left corner on the plan, in inches. */
  position: Point;
}

export interface JobDesign {
  countertops: Countertop[];
}

const SHAPES: ShapeKind[] = ['rectangle', 'L', 'U'];
const PROFILES: EdgeProfile[] = ['Unfinished', 'Eased', 'Beveled', 'Bullnose'];
const SINKS: SinkType[] = ['None', 'Drop-in', 'Undermount'];
const GRADE_LEVELS: Grade[] = [1, 2, 3];

/** A new, blank countertop named "Countertop N" with the next free N. */
export function newCountertop(existing: Countertop[]): Countertop {
  const taken = new Set(existing.map((c) => c.name));
  let n = existing.length + 1;
  while (taken.has(`Countertop ${n}`)) n++;
  return { id: crypto.randomUUID(), name: `Countertop ${n}`, design: null, position: { x: 0, y: 0 } };
}

/** The design fields in a fixed order, so the same design always gives the same JSON. */
function storedDesign(d: Design) {
  return {
    shape: d.shape,
    length: d.length,
    depth: d.depth,
    leftExtension: d.leftExtension,
    rightExtension: d.rightExtension,
    material: d.material,
    grade: d.grade,
    edgeProfile: d.edgeProfile,
    roundedCorners: d.roundedCorners,
    sink: d.sink,
    sinkCenter: d.sinkCenter, // left out of the JSON when not set
    freestanding: d.freestanding,
  };
}

/** Always the same text for the same job, so comparing strings tells whether anything changed. */
export const serializeJobDesign = (job: JobDesign): string =>
  JSON.stringify({
    countertops: job.countertops.map((c) => ({
      id: c.id,
      name: c.name,
      position: { x: c.position.x, y: c.position.y },
      design: c.design && storedDesign(c.design),
    })),
  });

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isOneOf = <T,>(list: T[], v: unknown): v is T => list.includes(v as T);
const isPoint = (v: unknown): v is Point => !!v && isNumber((v as Point).x) && isNumber((v as Point).y);

/** A design from saved JSON, or undefined if any field is missing or wrong. */
function readDesign(raw: unknown): Design | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const { shape, length, depth, leftExtension, rightExtension, material, grade, edgeProfile, roundedCorners, sink, sinkCenter, freestanding } =
    raw as Record<string, unknown>;
  if (freestanding !== undefined && typeof freestanding !== 'boolean') return undefined;
  if (!isOneOf(SHAPES, shape) || !isOneOf(SINKS, sink) || !isOneOf(GRADE_LEVELS, grade)) return undefined;
  if (typeof material !== 'string' || !isMaterial(material)) return undefined;
  if (!isNumber(length) || !isNumber(depth) || !isNumber(leftExtension) || !isNumber(rightExtension)) return undefined;
  if (!isOneOf(PROFILES, edgeProfile) || typeof roundedCorners !== 'boolean') return undefined;
  if (sinkCenter !== undefined && !isPoint(sinkCenter)) return undefined;

  // Rebuilt field by field, so unknown keys in the JSON are dropped.
  return {
    shape,
    length,
    depth,
    leftExtension,
    rightExtension,
    material,
    grade,
    edgeProfile,
    roundedCorners,
    sink,
    ...(sinkCenter ? { sinkCenter: { x: sinkCenter.x, y: sinkCenter.y } } : {}),
    // Not saved means against a wall, the usual case.
    freestanding: freestanding === true,
  };
}

function readCountertop(raw: unknown): Countertop | null {
  const { id, name, design, position } = (raw ?? {}) as Record<string, unknown>;
  if (typeof id !== 'string' || !id || typeof name !== 'string' || !isPoint(position)) return null;
  const at = { x: position.x, y: position.y };
  if (design === null) return { id, name, design: null, position: at };
  const read = readDesign(design);
  return read ? { id, name, design: read, position: at } : null;
}

/** The saved job. Empty or unreadable JSON gives a job with no countertops yet: a blank canvas. */
export function parseJobDesign(json: string): JobDesign {
  let raw: unknown;
  try {
    raw = JSON.parse(json || '{}');
  } catch {
    return { countertops: [] };
  }
  const list = (raw as { countertops?: unknown })?.countertops;
  if (!Array.isArray(list)) return { countertops: [] };
  return { countertops: list.map(readCountertop).filter((c): c is Countertop => c !== null) };
}
