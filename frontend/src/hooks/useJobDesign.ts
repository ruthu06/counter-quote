// The job's countertops while they're being edited: the list, which one is selected, and each
// one's editing state. The state lives here, not in each countertop's component, because only
// the selected one is on screen and Generate quote needs all of them.

import { useState } from 'react';
import { type Countertop, type JobDesign, newCountertop } from '../lib/designStorage';
import { type Point, type ShapeKind, fieldErrors, newDesign, placeAfter } from '../lib/geometry';
import { type DesignApi, type DesignState, designApi, initialState, setShape } from '../lib/designState';

/** A countertop being edited. `edit` is null until a shape is picked (a blank canvas). */
export interface CountertopItem {
  id: string;
  name: string;
  edit: DesignState | null;
  /** Top-left corner on the plan, in inches. */
  position: Point;
}

export interface JobState {
  items: CountertopItem[];
  selectedId: string | null;
}

/** A job can have up to this many countertops, which keeps the drawing readable. */
export const MAX_COUNTERTOPS = 4;

export function jobState(job: JobDesign): JobState {
  const items = job.countertops.map((c) => ({
    id: c.id,
    name: c.name,
    edit: c.design && initialState(c.design),
    position: c.position,
  }));
  return { items, selectedId: items[0]?.id ?? null };
}

const toCountertops = (items: CountertopItem[]): Countertop[] =>
  items.map((i) => ({ id: i.id, name: i.name, design: i.edit?.design ?? null, position: i.position }));

/** What gets saved and priced: each countertop's last valid design. */
export const toJobDesign = (state: JobState): JobDesign => ({ countertops: toCountertops(state.items) });

/** Adds a blank countertop and selects it; does nothing once the job has MAX_COUNTERTOPS. */
export function addCountertop(state: JobState): JobState {
  if (state.items.length >= MAX_COUNTERTOPS) return state;
  const c = newCountertop(toCountertops(state.items));
  return { items: [...state.items, { id: c.id, name: c.name, edit: null, position: c.position }], selectedId: c.id };
}

/** Removes a countertop; if it was selected, selects the one that took its place (or the last). */
export function removeCountertop(state: JobState, id: string): JobState {
  const index = state.items.findIndex((i) => i.id === id);
  const items = state.items.filter((i) => i.id !== id);
  const selectedId = state.selectedId !== id ? state.selectedId : (items[Math.min(index, items.length - 1)]?.id ?? null);
  return { items, selectedId };
}

export function renameCountertop(state: JobState, id: string, name: string): JobState {
  return { ...state, items: state.items.map((i) => (i.id === id ? { ...i, name } : i)) };
}

/**
 * Picks a shape: reshapes a drawn countertop, or draws a blank one at the default sizes,
 * placed to the right of the others so it never lands on top of one.
 */
export function pickShape(state: JobState, id: string, shape: ShapeKind): JobState {
  const drawn = state.items.filter((i) => i.edit && i.id !== id).map((i) => ({ design: i.edit!.design, at: i.position }));
  return {
    ...state,
    items: state.items.map((i) => {
      if (i.id !== id) return i;
      if (i.edit) return { ...i, edit: setShape(i.edit, shape) };
      return { ...i, edit: initialState(newDesign(shape, 'Quartz')), position: placeAfter(drawn) };
    }),
  };
}

/** Moves a countertop on the plan, snapped to whole inches. */
export function moveCountertop(state: JobState, id: string, to: Point): JobState {
  const at = { x: Math.round(to.x), y: Math.round(to.y) };
  return { ...state, items: state.items.map((i) => (i.id === id ? { ...i, position: at } : i)) };
}

/** Applies an editing action to one countertop's design. */
export function editCountertop(state: JobState, id: string, change: (s: DesignState) => DesignState): JobState {
  return { ...state, items: state.items.map((i) => (i.id === id && i.edit ? { ...i, edit: change(i.edit) } : i)) };
}

/** Names of countertops whose typed measurements are invalid right now. */
export const invalidCountertops = (state: JobState): string[] =>
  state.items.filter((i) => i.edit && Object.keys(fieldErrors(i.edit.draft)).length > 0).map((i) => i.name);

export function useJobDesign(initial: JobDesign) {
  const [state, setState] = useState(() => jobState(initial));
  const selected = state.items.find((i) => i.id === state.selectedId) ?? null;

  // The usual editing actions, bound to the selected countertop. Null until it has a shape.
  const selectedApi: DesignApi | null =
    selected?.edit ? designApi(selected.edit, (change) => setState((s) => editCountertop(s, selected.id, change))) : null;

  return {
    items: state.items,
    selected,
    selectedApi,
    jobDesign: toJobDesign(state),
    invalid: invalidCountertops(state),
    canAdd: state.items.length < MAX_COUNTERTOPS,
    select: (id: string) => setState((s) => ({ ...s, selectedId: id })),
    add: () => setState(addCountertop),
    remove: (id: string) => setState((s) => removeCountertop(s, id)),
    rename: (id: string, name: string) => setState((s) => renameCountertop(s, id, name)),
    pickShape: (id: string, shape: ShapeKind) => setState((s) => pickShape(s, id, shape)),
    move: (id: string, to: Point) => setState((s) => moveCountertop(s, id, to)),
  };
}

export type JobDesignApi = ReturnType<typeof useJobDesign>;
