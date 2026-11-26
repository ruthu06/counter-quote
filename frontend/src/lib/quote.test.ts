import { describe, expect, it } from 'vitest';
import { PRICES } from '../test/prices';
import { type Design, newDesign } from './geometry';
import { quote, quoteJob } from './quote';

// The design mock: an L in Quartz Premium ($80/sq ft) with an undermount sink.
const mock: Design = { ...newDesign('L', 'Quartz'), grade: 2, sink: 'Undermount' };

describe('quote', () => {
  it('prices the mock: 30 sq ft x $80 + undermount $250', () => {
    const q = quote(mock, PRICES);
    expect(q.lines).toEqual([
      { label: 'Quartz · Premium', calc: { quantity: 30, unit: 'sq. ft.', unitPrice: 80 }, amount: 2400 },
      { label: 'Undermount sink', amount: 250 },
    ]);
    expect(q.total).toBe(2650);
  });

  it('charges the chosen profile on exposed edges only, partial feet billed up', () => {
    // Exposed: right end 24 + front 96 + leg inside 60 + leg end 24 = 204" = 17 ft
    const q = quote({ ...mock, edgeProfile: 'Bullnose' }, PRICES);
    expect(q.lines.find((l) => l.label === 'Bullnose edges')).toEqual({
      label: 'Bullnose edges', calc: { quantity: 17, unit: 'ft.', unitPrice: 15 }, amount: 255,
    });
  });

  it('bills area up to the next tenth, so the line shown multiplies out exactly', () => {
    // 85 x 25 = 14.757 sq ft -> 14.8 x $50 = $740; Beveled on 25 + 85 + 25 = 135" -> 12 ft x $10
    const q = quote({ ...newDesign('rectangle', 'Granite'), length: 85, depth: 25, edgeProfile: 'Beveled', sink: 'Drop-in' }, PRICES);
    expect(q.lines.map((l) => [l.label, l.calc?.quantity, l.amount])).toEqual([
      ['Granite · Standard', 14.8, 740],
      ['Beveled edges', 12, 120],
      ['Drop-in sink', undefined, 100],
    ]);
    expect(q.lines.every((l) => !l.calc || Math.round(l.calc.quantity * l.calc.unitPrice * 100) / 100 === l.amount)).toBe(true);
    expect(q.total).toBe(960);
  });

  it('charges $60 for each rounded corner', () => {
    const q = quote({ ...mock, roundedCorners: true }, PRICES);
    expect(q.lines.find((l) => l.label === 'Rounded corners')?.calc).toEqual({ quantity: 2, unit: 'corners', unitPrice: 60 });
  });

  it('prices each grade from the table', () => {
    const perSqFt = (material: Design['material'], grade: Design['grade']) =>
      quote({ ...mock, material, grade }, PRICES).lines[0].calc!.unitPrice;
    expect([perSqFt('Granite', 1), perSqFt('Quartz', 3), perSqFt('Marble', 2)]).toEqual([50, 120, 100]);
  });

  it('charges a freestanding island for its back edge and all four corners', () => {
    const island = { ...newDesign('rectangle', 'Granite'), length: 72, depth: 36, edgeProfile: 'Bullnose' as const, roundedCorners: true };
    expect(quote(island, PRICES).total).toBe(900 + 12 * 15 + 2 * 60);
    expect(quote({ ...island, freestanding: true }, PRICES).total).toBe(900 + 18 * 15 + 4 * 60);
  });

  it("doesn't change with where the sink sits", () => {
    expect(quote({ ...mock, sinkCenter: { x: 12, y: 60 } }, PRICES).total).toBe(quote(mock, PRICES).total);
  });

  it('gives an error instead of $0 when a price is missing', () => {
    const q = quote(mock, PRICES.filter((p) => p.name !== 'Quartz Level 2'));
    expect(q).toEqual({ lines: [], total: 0, errors: ['No price for material "Quartz Level 2".'] });
  });

  it('gives the measurement error for an impossible shape', () => {
    expect(quote({ ...mock, shape: 'U', rightExtension: 0 }, PRICES).errors).toEqual(['Right Extension must be 1–240 in.']);
  });
});

describe('quoteJob', () => {
  it('adds up each countertop and skips ones without a shape', () => {
    const island = { ...newDesign('rectangle', 'Granite'), length: 72, depth: 36 };
    const job = quoteJob(
      [
        { id: 'k', name: 'Kitchen', design: mock },
        { id: 'i', name: 'Island', design: island },
        { id: 'v', name: 'Vanity', design: null },
      ],
      PRICES,
    );
    expect(job.countertops.map((c) => [c.name, c.quote.total])).toEqual([['Kitchen', 2650], ['Island', 900]]);
    expect(job.total).toBe(3550);
  });

  it("names the countertop in each error", () => {
    const job = quoteJob([{ id: 'k', name: 'Kitchen', design: { ...mock, length: NaN } }], PRICES);
    expect(job.errors).toEqual(['Kitchen: Length must be 12–300 in.']);
  });
});
