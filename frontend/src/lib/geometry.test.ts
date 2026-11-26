import { describe, expect, it } from 'vitest';
import {
  type Design,
  clampDimension,
  edgeProfile,
  fieldErrors,
  formatNumber,
  newDesign,
  outlinePath,
  overlaps,
  placeAfter,
  placeSink,
  resizeHandles,
  roundableCorners,
  roundedCornersOf,
  shapeToPolygon,
  sizeOf,
  validateDesign,
} from './geometry';

const L = newDesign('L', 'Quartz'); // 120 x 24 back run, 60" leg: the design mock
const U = { ...newDesign('U', 'Quartz'), length: 144, leftExtension: 48, rightExtension: 72 };
const rect = { ...newDesign('rectangle', 'Granite'), length: 96, depth: 25.5 };
const edgeLength = (d: Design, id: string) => shapeToPolygon(d).edges.find((e) => e.id === id)!.length;

describe('shapeToPolygon', () => {
  it('works out the area of the mock L, counting the corner once (30 sq ft, not 34)', () => {
    expect(shapeToPolygon(L).areaSqFt).toBe(30);
  });

  it('works out an uneven U: 144x24 + 24x48 + 24x72 = 44 sq ft', () => {
    expect(shapeToPolygon(U).areaSqFt).toBe(44);
    expect(edgeLength(U, 'front')).toBe(96);
    expect(edgeLength(U, 'left-wall')).toBe(72);
    expect(edgeLength(U, 'right-wall')).toBe(96);
  });

  it('gives each shape its edges, with the back and side walls against a wall', () => {
    expect(shapeToPolygon(rect).edges.filter((e) => e.againstWall).map((e) => e.id)).toEqual(['back']);
    expect(shapeToPolygon(L).edges.filter((e) => e.againstWall).map((e) => e.id)).toEqual(['back', 'left-wall']);
    expect(shapeToPolygon(U).edges.filter((e) => e.againstWall)).toHaveLength(3);
  });

  it('has no wall edges when freestanding', () => {
    expect(shapeToPolygon({ ...L, freestanding: true }).edges.some((e) => e.againstWall)).toBe(false);
  });

  it('measures how much room a countertop takes', () => {
    expect(sizeOf(L)).toEqual({ width: 120, height: 84 });
  });
});

describe('edgeProfile', () => {
  it('is Unfinished against a wall and the chosen profile elsewhere', () => {
    const d = { ...L, edgeProfile: 'Bullnose' as const };
    expect(shapeToPolygon(d).edges.map((e) => edgeProfile(d, e))).toEqual([
      'Unfinished', 'Bullnose', 'Bullnose', 'Bullnose', 'Bullnose', 'Unfinished',
    ]);
  });
});

describe('fieldErrors / validateDesign', () => {
  it('accepts the default designs', () => {
    for (const shape of ['rectangle', 'L', 'U'] as const) expect(fieldErrors(newDesign(shape, 'Quartz'))).toEqual({});
  });

  it('catches typos and empty boxes per field', () => {
    expect(fieldErrors({ ...L, depth: 1200 }).depth).toBe('Depth must be 12–48 in.');
    expect(fieldErrors({ ...L, length: NaN }).length).toBe('Length must be 12–300 in.');
  });

  it('only checks the fields the shape uses', () => {
    expect(fieldErrors({ ...rect, leftExtension: NaN, rightExtension: NaN })).toEqual({});
    expect(fieldErrors({ ...U, rightExtension: 0 }).rightExtension).toBe('Right Extension must be 1–240 in.');
  });

  it('rejects an impossible U', () => {
    expect(validateDesign({ ...U, length: 40 })).toEqual(['Length must be more than twice the depth for a U.']);
  });
});

describe('corners', () => {
  it('can round only outside corners with both edges exposed', () => {
    const at = (d: Design) => roundableCorners(shapeToPolygon(d)).map((i) => shapeToPolygon(d).points[i]);
    expect(at(rect)).toEqual([{ x: 96, y: 25.5 }, { x: 0, y: 25.5 }]);
    expect(at(L)).toEqual([{ x: 120, y: 24 }, { x: 24, y: 84 }]);
    expect(at(U)).toEqual([{ x: 120, y: 96 }, { x: 24, y: 72 }]);
  });

  it('can round every outside corner of a freestanding piece', () => {
    expect(roundableCorners(shapeToPolygon({ ...rect, freestanding: true }))).toHaveLength(4);
    expect(roundableCorners(shapeToPolygon({ ...L, freestanding: true }))).toHaveLength(5);
  });

  it('rounds all of them, or none', () => {
    expect(roundedCornersOf({ ...L, roundedCorners: true }, shapeToPolygon(L))).toEqual([2, 4]);
    expect(roundedCornersOf(L, shapeToPolygon(L))).toEqual([]);
  });

  it('draws an arc for each rounded corner', () => {
    expect(outlinePath(shapeToPolygon(L), [2, 4]).match(/ A /g)).toHaveLength(2);
    expect(outlinePath(shapeToPolygon(L), [])).not.toContain(' A ');
  });
});

describe('resize handles', () => {
  it('sit on the right end, the front edge and each leg end', () => {
    const at = (d: Design) => Object.fromEntries(resizeHandles(d).map((h) => [h.field, h.at]));
    expect(at(L)).toEqual({ length: { x: 120, y: 12 }, depth: { x: 96, y: 24 }, leftExtension: { x: 12, y: 84 } });
    expect(Object.keys(at(U))).toEqual(['length', 'depth', 'leftExtension', 'rightExtension']);
  });

  it('snap to half an inch and stay inside the limits', () => {
    expect(clampDimension(L, 'length', 133.3)).toBe(133.5);
    expect(clampDimension(L, 'length', 999)).toBe(300);
    expect(clampDimension(L, 'depth', -40)).toBe(12);
  });

  it('never make an impossible shape', () => {
    expect(clampDimension(U, 'length', 20)).toBe(48.5); // just over twice the depth
    expect(clampDimension({ ...U, length: 60 }, 'depth', 47)).toBe(29.5);
    for (const d of [rect, L, U])
      for (const { field } of resizeHandles(d))
        for (let v = -100; v <= 400; v += 7.3) expect(fieldErrors({ ...d, [field]: clampDimension(d, field, v) })).toEqual({});
  });
});

describe('sink placement', () => {
  it('starts in the middle of the back run, 30 x 18', () => {
    expect(placeSink(L)).toEqual({ center: { x: 60, y: 12 }, width: 30, height: 18 });
  });

  it('stays on the counter with 3" of stone around it', () => {
    expect(placeSink({ ...L, sinkCenter: { x: 500, y: 12 } }).center).toEqual({ x: 102, y: 12 });
    expect(placeSink({ ...L, sinkCenter: { x: 70, y: 70 } }).center).toEqual({ x: 70, y: 12 }); // L's open corner
  });

  it('turns to run along a leg', () => {
    expect(placeSink({ ...L, sinkCenter: { x: 12, y: 60 } })).toEqual({ center: { x: 12, y: 60 }, width: 18, height: 30 });
  });

  it('shrinks to fit a shallow counter', () => {
    expect(placeSink({ ...L, depth: 12 }).height).toBe(6);
  });
});

describe('countertops on the plan', () => {
  const island = { ...newDesign('rectangle', 'Granite'), length: 72, depth: 36 };

  it('overlap only when the real shapes cross, not their bounding boxes', () => {
    expect(overlaps({ design: L, at: { x: 0, y: 0 } }, { design: island, at: { x: 36, y: 36 } })).toBe(false); // in the L's corner
    expect(overlaps({ design: L, at: { x: 0, y: 0 } }, { design: island, at: { x: 40, y: 10 } })).toBe(true);
    expect(overlaps({ design: L, at: { x: 0, y: 0 } }, { design: island, at: { x: 120, y: 0 } })).toBe(false); // touching
  });

  it('places a new one to the right of the others, on a whole foot', () => {
    expect(placeAfter([])).toEqual({ x: 0, y: 0 });
    expect(placeAfter([{ design: L, at: { x: 0, y: 0 } }])).toEqual({ x: 144, y: 0 });
  });
});

describe('formatNumber', () => {
  it('shows at most one decimal and drops .0', () => {
    expect([30, 14.7569, 25.5, 29.96].map(formatNumber)).toEqual(['30', '14.8', '25.5', '30']);
  });
});
