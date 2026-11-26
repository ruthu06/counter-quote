import { describe, expect, it } from 'vitest';
import { type JobDesign, newCountertop, parseJobDesign, serializeJobDesign } from './designStorage';
import { newDesign } from './geometry';

const job: JobDesign = {
  countertops: [
    {
      id: 'k',
      name: 'Kitchen countertop',
      position: { x: 0, y: 0 },
      design: { ...newDesign('L', 'Quartz'), grade: 2, edgeProfile: 'Bullnose', roundedCorners: true, sink: 'Undermount', sinkCenter: { x: 80, y: 12 } },
    },
    { id: 'i', name: 'Center island', position: { x: 42, y: 42 }, design: { ...newDesign('rectangle', 'Granite'), freestanding: true } },
    { id: 'v', name: 'Vanity', position: { x: 0, y: 0 }, design: null },
  ],
};
const json = serializeJobDesign(job);

describe('saving and reading a job', () => {
  it('reads back exactly what was saved', () => {
    expect(parseJobDesign(json)).toEqual(job);
  });

  it('gives a blank job for empty or unreadable JSON', () => {
    expect(parseJobDesign('')).toEqual({ countertops: [] });
    expect(parseJobDesign('{oops')).toEqual({ countertops: [] });
  });

  it('leaves out a countertop with anything wrong, keeping the rest', () => {
    const raw = JSON.parse(json);
    raw.countertops[0].design.material = 'Wood';
    expect(parseJobDesign(JSON.stringify(raw)).countertops.map((c) => c.name)).toEqual(['Center island', 'Vanity']);
  });

  it('rejects bad values field by field', () => {
    const withDesign = (patch: object) => {
      const raw = JSON.parse(json);
      Object.assign(raw.countertops[1].design, patch);
      return parseJobDesign(JSON.stringify(raw)).countertops.length;
    };
    expect(withDesign({ length: '120' })).toBe(2);
    expect(withDesign({ edgeProfile: 'Ogee' })).toBe(2);
    expect(withDesign({ roundedCorners: [0, 1] })).toBe(2);
    expect(withDesign({ freestanding: 'yes' })).toBe(2);
  });

  it('reads a missing freestanding flag as against a wall', () => {
    const raw = JSON.parse(json);
    delete raw.countertops[1].design.freestanding;
    expect(parseJobDesign(JSON.stringify(raw)).countertops[1].design?.freestanding).toBe(false);
  });

  it('drops unknown keys', () => {
    const raw = JSON.parse(json);
    raw.countertops[1].design.hack = 1;
    expect(parseJobDesign(JSON.stringify(raw)).countertops[1].design).not.toHaveProperty('hack');
  });
});

describe('newCountertop', () => {
  it('names it with the next unused number', () => {
    expect(newCountertop([]).name).toBe('Countertop 1');
    expect(newCountertop([{ id: 'a', name: 'Countertop 2', design: null, position: { x: 0, y: 0 } }]).name).toBe('Countertop 3');
  });
});
