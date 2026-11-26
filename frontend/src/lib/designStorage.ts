// Turns a design into the JSON saved on a job (Job.designJson), and back.
// Reading checks every field: anything missing or unexpected gives null, and the page
// starts from the sample design instead of breaking on old or hand-edited data.

import type { Design, EdgeProfile, Grade, Point, ShapeKind, SinkType } from './geometry';
import { isMaterial } from './materials';

const SHAPES: ShapeKind[] = ['rectangle', 'L', 'U'];
const PROFILES: EdgeProfile[] = ['Unfinished', 'Eased', 'Beveled', 'Bullnose'];
const SINKS: SinkType[] = ['None', 'Drop-in', 'Undermount'];
const GRADE_LEVELS: Grade[] = [1, 2, 3];

/**
 * Always the same text for the same design (fixed key order, sorted edge ids), so comparing
 * two strings tells whether anything changed since the last save.
 */
export function serializeDesign(d: Design): string {
  const edgeProfiles = Object.fromEntries(Object.entries(d.edgeProfiles).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify({
    shape: d.shape,
    length: d.length,
    depth: d.depth,
    leftExtension: d.leftExtension,
    rightExtension: d.rightExtension,
    material: d.material,
    grade: d.grade,
    edgeProfiles,
    roundedCorners: [...d.roundedCorners].sort((a, b) => a - b),
    sink: d.sink,
    sinkCenter: d.sinkCenter, // left out of the JSON when not set
  });
}

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isOneOf = <T extends string>(list: T[], v: unknown): v is T => list.includes(v as T);
const isPoint = (v: unknown): v is Point => !!v && isNumber((v as Point).x) && isNumber((v as Point).y);

/** The saved design, or null if there isn't one or it can't be trusted. */
export function parseDesign(json: string): Design | null {
  if (!json) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;

  const { shape, length, depth, leftExtension, rightExtension, material, edgeProfiles, roundedCorners, sink, sinkCenter } = raw;
  // Designs saved before grades existed have none: they were priced like today's Standard.
  const grade = raw.grade ?? 1;
  if (!GRADE_LEVELS.includes(grade as Grade)) return null;
  if (!isOneOf(SHAPES, shape) || !isOneOf(SINKS, sink) || typeof material !== 'string' || !isMaterial(material)) return null;
  if (![length, depth, leftExtension, rightExtension].every(isNumber)) return null;
  if (!edgeProfiles || typeof edgeProfiles !== 'object' || !Object.values(edgeProfiles).every((p) => isOneOf(PROFILES, p))) return null;
  if (!Array.isArray(roundedCorners) || !roundedCorners.every(Number.isInteger)) return null;
  if (sinkCenter !== undefined && !isPoint(sinkCenter)) return null;

  // Rebuilt field by field, so unknown keys in the JSON are dropped.
  return {
    shape,
    length: length as number,
    depth: depth as number,
    leftExtension: leftExtension as number,
    rightExtension: rightExtension as number,
    material,
    grade: grade as Grade,
    edgeProfiles: edgeProfiles as Design['edgeProfiles'],
    roundedCorners: roundedCorners as number[],
    sink,
    ...(sinkCenter ? { sinkCenter: { x: sinkCenter.x, y: sinkCenter.y } } : {}),
  };
}
