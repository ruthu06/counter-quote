// The shop's price list as GET /api/pricing returns it (same rows as the backend's seed data),
// for tests that price a design.

import type { PricingItem } from '../api';

const rows: [PricingItem['category'], string, number, PricingItem['unit']][] = [
  ['Material', 'Granite Level 1', 50, 'sqft'],
  ['Material', 'Granite Level 2', 70, 'sqft'],
  ['Material', 'Granite Level 3', 100, 'sqft'],
  ['Material', 'Quartz Level 1', 60, 'sqft'],
  ['Material', 'Quartz Level 2', 80, 'sqft'],
  ['Material', 'Quartz Level 3', 120, 'sqft'],
  ['Material', 'Marble Level 1', 70, 'sqft'],
  ['Material', 'Marble Level 2', 100, 'sqft'],
  ['Material', 'Marble Level 3', 160, 'sqft'],
  ['Edge', 'Unfinished', 0, 'linearft'],
  ['Edge', 'Eased', 0, 'linearft'],
  ['Edge', 'Beveled', 10, 'linearft'],
  ['Edge', 'Bullnose', 15, 'linearft'],
  ['Corner', 'Square', 0, 'each'],
  ['Corner', 'Rounded', 60, 'each'],
  ['Sink', 'None', 0, 'each'],
  ['Sink', 'Drop-in', 100, 'each'],
  ['Sink', 'Undermount', 250, 'each'],
];

export const PRICES: PricingItem[] = rows.map(([category, name, price, unit], i) => ({ id: i + 1, category, name, price, unit }));
