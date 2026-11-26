// The materials and their grades, plus what each stone looks like on the drawing:
// a base colour with speckles or veins, sized in inches like the drawing. Patterns are
// generated once with a fixed seed, so the stone looks the same on every render.
// Drawn by components/MaterialPattern.tsx.

import type { Grade, Material } from './geometry';

export const MATERIALS: Material[] = ['Granite', 'Quartz', 'Marble'];

export const GRADES: { level: Grade; name: string }[] = [
  { level: 1, name: 'Standard' },
  { level: 2, name: 'Premium' },
  { level: 3, name: 'Luxury' },
];

export const gradeName = (grade: Grade) => GRADES.find((g) => g.level === grade)!.name;

/** The price-list name for a material at a grade, e.g. "Marble Level 1" (see GET /api/pricing). */
export const materialPriceName = (material: Material, grade: Grade) => `${material} Level ${grade}`;

/** What each grade looks like, with example stones, to help a customer choose. */
export const GRADE_DESCRIPTIONS: Record<Material, Record<Grade, string>> = {
  Granite: {
    1: 'Popular colours with an even, speckled pattern, e.g. Uba Tuba, Baltic Brown, New Venetian Gold.',
    2: 'Less common stones with more colour movement, e.g. Santa Cecilia, Alaska White, Bianco Romano.',
    3: 'Rare, exotic slabs with bold, dramatic patterns and unusual colours.',
  },
  Quartz: {
    1: 'Solid colours and a fine, even speckle.',
    2: 'Marble-look designs with soft veining.',
    3: 'Bold, realistic veining and designer colours.',
  },
  Marble: {
    1: 'Classic colours and subtle veining.',
    2: 'Brighter whites with clearer, more defined veining.',
    3: 'Rare stones with dramatic veining, e.g. Calacatta.',
  },
};

export const isMaterial = (value: string): value is Material => (MATERIALS as string[]).includes(value);

export interface Speckle {
  cx: number;
  cy: number;
  r: number;
  fill: string;
}

export interface Vein {
  /** SVG polyline points, "x,y x,y ...". */
  points: string;
  /** Vertical shift; each vein is drawn twice so it wraps across the tile edge. */
  dy: number;
  color: string;
  width: number;
  opacity: number;
}

export interface MaterialTile {
  width: number;
  height: number;
  base: string;
  speckles: Speckle[];
  veins: Vein[];
}

/** Small seeded random generator (mulberry32): same seed, same numbers. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dots scattered over a square tile, e.g. the flecks in quartz and granite. */
function speckles(seed: number, size: number, count: number, colors: string[], minR: number, maxR: number): Speckle[] {
  const random = seeded(seed);
  return Array.from({ length: count }, () => ({
    cx: random() * size,
    cy: random() * size,
    r: minR + random() * (maxR - minR),
    fill: colors[Math.floor(random() * colors.length)],
  }));
}

/**
 * Wavy diagonal veins. The slope is height/width and the waves repeat across the width,
 * so a vein leaving one tile lines up with the next one: no visible seams.
 */
function veins(seed: number, width: number, height: number): Vein[] {
  const random = seeded(seed);
  const vein = (color: string, strokeWidth: number, opacity: number): Vein[] => {
    const startY = random() * height;
    // A slow drift plus finer, uneven jitter, so veins wander instead of waving evenly.
    const waves = [1, 4 + Math.floor(random() * 3), 11 + Math.floor(random() * 6)];
    const amplitudes = [1 + random() * 2, 0.3 + random() * 0.6, 0.1 + random() * 0.25];
    const phases = waves.map(() => random() * Math.PI * 2);
    const points = Array.from({ length: 97 }, (_, s) => {
      const x = (s / 96) * width;
      const y =
        startY +
        (x * height) / width +
        waves.reduce((sum, w, k) => sum + amplitudes[k] * Math.sin((2 * Math.PI * w * x) / width + phases[k]), 0);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    // Twice, one tile up, so the part that runs off the bottom also shows at the top.
    return [0, -height].map((dy) => ({ points, dy, color, width: strokeWidth, opacity }));
  };
  return [
    ...[0, 1].flatMap(() => vein('#b8bcc4', 1.4, 0.3)),
    ...[2, 3, 4].flatMap(() => vein('#8e949e', 0.2, 0.6)),
  ];
}

export const MATERIAL_TILES: Record<Material, MaterialTile> = {
  // Engineered stone: even, fine speckle on a warm off-white.
  Quartz: {
    width: 24,
    height: 24,
    base: '#eeeae3',
    speckles: speckles(11, 24, 320, ['#d3ccbf', '#bdb4a6', '#fbfaf7'], 0.06, 0.18),
    veins: [],
  },
  // Natural stone: small black, white and rust flecks on grey-beige.
  Granite: {
    width: 24,
    height: 24,
    base: '#9a958d',
    speckles: speckles(23, 24, 650, ['#4a4642', '#4a4642', '#cfc9bf', '#7a6152', '#86817a', '#86817a'], 0.08, 0.28),
    veins: [],
  },
  // Bright white with soft grey veins.
  Marble: {
    width: 96,
    height: 48,
    base: '#f6f5f2',
    speckles: [],
    veins: veins(37, 96, 48),
  },
};
