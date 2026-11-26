// Prices a design using the shop's price list from GET /api/pricing.
// Pure: the same design and prices always give the same quote, with no network calls.

import type { PricingCategory, PricingItem } from '../api';
import {
  type Design,
  type EdgeProfile,
  edgeProfile,
  roundedCornersOf,
  shapeToPolygon,
  validateDesign,
} from './geometry';
import { gradeName, materialPriceName } from './materials';

export interface QuoteLine {
  /** e.g. "Quartz", "Bullnose edges", "Undermount sink" */
  label: string;
  /** How the amount was worked out, e.g. 30 sq. ft. × $80. Missing for flat fees like a sink. */
  calc?: { quantity: number; unit: string; unitPrice: number };
  /** Always exactly quantity × unitPrice, so the maths shown on screen adds up. */
  amount: number;
}

export interface Quote {
  lines: QuoteLine[];
  total: number;
  /** Why no price could be given: an impossible shape or a missing price. Total is 0 when not empty. */
  errors: string[];
}

const INCHES_PER_FOOT = 12;

/** The price-list row for an option, e.g. ('Edge', 'Bullnose'); undefined if the list has none. */
export function findPrice(prices: PricingItem[], category: PricingCategory, name: string): PricingItem | undefined {
  return prices.find((p) => p.category === category && p.name === name);
}

export function quote(design: Design, prices: PricingItem[]): Quote {
  const shapeErrors = validateDesign(design);
  if (shapeErrors.length) return { lines: [], total: 0, errors: shapeErrors };

  const errors: string[] = [];
  const priceOf = (category: PricingCategory, name: string): number => {
    const item = findPrice(prices, category, name);
    if (!item) {
      errors.push(`No price for ${category.toLowerCase()} "${name}".`);
      return 0;
    }
    return item.price;
  };

  const outline = shapeToPolygon(design);
  const lines: QuoteLine[] = [];
  const add = (label: string, quantity: number, unit: string, unitPrice: number) => {
    const amount = toCents(quantity * unitPrice);
    // Lines at $0 (Eased, Unfinished, Square, no sink) are included and not worth listing.
    if (amount > 0) lines.push({ label, calc: { quantity, unit, unitPrice }, amount });
  };

  // Material: the corner where runs meet is counted once. Partial tenths of a square foot are
  // billed up, so the area shown (e.g. 14.8) times the price is exactly the amount charged.
  const billedArea = Math.ceil(outline.areaSqFt * 10 - 1e-9) / 10;
  add(
    `${design.material} · ${gradeName(design.grade)}`,
    billedArea,
    'sq. ft.',
    priceOf('Material', materialPriceName(design.material, design.grade)),
  );

  // Edges: total length per profile, with partial feet billed as whole feet.
  const inchesByProfile = new Map<EdgeProfile, number>();
  for (const edge of outline.edges) {
    const profile = edgeProfile(design, edge);
    inchesByProfile.set(profile, (inchesByProfile.get(profile) ?? 0) + edge.length);
  }
  for (const [profile, inches] of inchesByProfile) {
    const feet = Math.ceil(inches / INCHES_PER_FOOT - 1e-9);
    add(`${profile} edges`, feet, 'ft.', priceOf('Edge', profile));
  }

  // Corners: a flat fee for each rounded corner; only corners this shape can round are counted.
  const rounded = roundedCornersOf(design, outline).length;
  if (rounded > 0) {
    add('Rounded corners', rounded, rounded === 1 ? 'corner' : 'corners', priceOf('Corner', 'Rounded'));
  }

  // Sink: a flat cutout fee by type; where it sits doesn't change the price.
  const sinkPrice = priceOf('Sink', design.sink);
  if (sinkPrice > 0) lines.push({ label: `${design.sink} sink`, amount: toCents(sinkPrice) });

  if (errors.length) return { lines: [], total: 0, errors };
  // Each line is rounded to cents, so the total always equals the lines shown.
  return { lines, total: toCents(lines.reduce((sum, l) => sum + l.amount, 0)), errors: [] };
}

const toCents = (dollars: number) => Math.round(dollars * 100) / 100;
