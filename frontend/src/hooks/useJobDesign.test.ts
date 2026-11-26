import { describe, expect, it } from 'vitest';
import { setDimension, setMaterial } from '../lib/designState';
import { parseJobDesign, serializeJobDesign } from '../lib/designStorage';
import {
  MAX_COUNTERTOPS,
  addCountertop,
  editCountertop,
  invalidCountertops,
  jobState,
  moveCountertop,
  pickShape,
  removeCountertop,
  renameCountertop,
  toJobDesign,
} from './useJobDesign';

const empty = () => jobState({ countertops: [] });

describe('countertops in a job', () => {
  it('starts blank, and a new countertop has no shape until one is picked', () => {
    const s = addCountertop(empty());
    expect([s.items.length, s.items[0].name, s.items[0].edit, s.selectedId]).toEqual([1, 'Countertop 1', null, s.items[0].id]);
  });

  it('places each new shape to the right of the others', () => {
    let s = addCountertop(empty());
    s = pickShape(s, s.items[0].id, 'L');
    s = addCountertop(s);
    s = pickShape(s, s.items[1].id, 'rectangle');
    expect(s.items.map((i) => i.position)).toEqual([{ x: 0, y: 0 }, { x: 144, y: 0 }]);
  });

  it('edits only the countertop it is given', () => {
    let s = addCountertop(addCountertop(empty()));
    const [a, b] = s.items;
    s = pickShape(pickShape(s, a.id, 'L'), b.id, 'rectangle');
    s = editCountertop(s, b.id, (e) => setMaterial(e, 'Granite'));
    s = renameCountertop(s, b.id, 'Center island');
    expect(s.items.map((i) => [i.name, i.edit?.design.material])).toEqual([['Countertop 1', 'Quartz'], ['Center island', 'Granite']]);
  });

  it('moves a countertop, snapped to whole inches', () => {
    let s = addCountertop(empty());
    s = moveCountertop(s, s.items[0].id, { x: 30.4, y: 40.6 });
    expect(s.items[0].position).toEqual({ x: 30, y: 41 });
  });

  it(`stops at ${MAX_COUNTERTOPS} countertops`, () => {
    let s = empty();
    for (let i = 0; i < 6; i++) s = addCountertop(s);
    expect(s.items).toHaveLength(MAX_COUNTERTOPS);
  });

  it('selects a neighbour when the selected one is removed', () => {
    const s = addCountertop(addCountertop(empty()));
    const [a, b] = s.items;
    expect(removeCountertop(s, b.id).selectedId).toBe(a.id);
    expect(removeCountertop(removeCountertop(s, b.id), a.id)).toEqual({ items: [], selectedId: null });
  });

  it('names countertops whose typed sizes are invalid', () => {
    let s = addCountertop(empty());
    s = pickShape(s, s.items[0].id, 'rectangle');
    s = editCountertop(s, s.items[0].id, (e) => setDimension(e, 'length', ''));
    expect(invalidCountertops(s)).toEqual(['Countertop 1']);
  });

  it('saves and reloads to the same job', () => {
    let s = addCountertop(addCountertop(empty()));
    s = pickShape(s, s.items[0].id, 'U');
    const json = serializeJobDesign(toJobDesign(s));
    expect(serializeJobDesign(toJobDesign(jobState(parseJobDesign(json))))).toBe(json);
  });
});
