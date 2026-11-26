// Colours used on the drawing.

import type { EdgeProfile } from '../../lib/geometry';

export const COLORS = {
  grid: '#e3e7ec',
  outline: '#33413b',
  dimension: '#1f2933',
  hover: '#1d5fa8',
  wall: '#8a949e',
  // Outline of a countertop that overlaps another.
  clash: '#c62828',
};

/** How each paid edge profile is marked on the drawing; Eased is the plain outline, Unfinished a wall strip. */
export const PROFILE_COLORS: Partial<Record<EdgeProfile, string>> = {
  Beveled: '#c27c0e',
  Bullnose: '#7b4fc4',
};
