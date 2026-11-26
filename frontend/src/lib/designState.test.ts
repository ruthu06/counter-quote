import { describe, expect, it } from 'vitest';
import {
  cornerStyle,
  initialState,
  moveSink,
  setCorners,
  setDimension,
  setExposedEdges,
  setFreestanding,
  setMaterial,
  setShape,
} from './designState';
import { fieldErrors, newDesign } from './geometry';

const U = { ...newDesign('U', 'Quartz'), length: 144, leftExtension: 48, rightExtension: 72 };

describe('typing a measurement', () => {
  it('keeps exactly what was typed, and the drawing on the last valid size', () => {
    let s = initialState(U);
    s = setDimension(s, 'length', '');
    expect([s.inputs.length, fieldErrors(s.draft).length, s.design.length]).toEqual(['', 'Length must be 12–300 in.', 144]);
    s = setDimension(s, 'length', '12'); // too short for a U
    expect(s.design.length).toBe(144);
    s = setDimension(s, 'length', '120');
    expect([s.design.length, fieldErrors(s.draft)]).toEqual([120, {}]);
  });

  it('accepts decimals and rejects text', () => {
    expect(setDimension(initialState(U), 'depth', '25.5').design.depth).toBe(25.5);
    expect(fieldErrors(setDimension(initialState(U), 'depth', 'abc').draft).depth).toBe('Depth must be 12–48 in.');
  });
});

describe('switching shape', () => {
  it('keeps length and depth, and fills an empty extension with 60', () => {
    const r = setShape(initialState(U), 'rectangle');
    expect([r.design.length, r.design.depth]).toEqual([144, 24]);
    const cleared = setDimension(setDimension(r, 'leftExtension', ''), 'rightExtension', '0');
    const l = setShape(cleared, 'L');
    expect([l.design.leftExtension, l.inputs.leftExtension]).toEqual([60, '60']);
    expect(setShape(l, 'U').design.rightExtension).toBe(60);
  });

  it('keeps the edge profile, corner style and material', () => {
    const s = setMaterial(setCorners(setExposedEdges(initialState(U), 'Bullnose'), 'Rounded'), 'Marble');
    const l = setShape(s, 'L');
    expect([l.design.edgeProfile, cornerStyle(l.design), l.design.material]).toEqual(['Bullnose', 'Rounded', 'Marble']);
  });
});

describe('always-valid choices', () => {
  it('apply to the drawing even while a box is mid-typing', () => {
    const typing = setDimension(initialState(U), 'length', '');
    expect(setMaterial(typing, 'Granite').design.material).toBe('Granite');
    expect(setFreestanding(typing, true).design.freestanding).toBe(true);
    expect(moveSink(typing, { x: 30, y: 12 }).design.sinkCenter).toEqual({ x: 30, y: 12 });
  });
});
