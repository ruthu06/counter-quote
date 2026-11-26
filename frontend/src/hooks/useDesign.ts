// Holds the design being edited: what is typed in each box, any errors, and the
// last valid design, which is what the drawing (and later the price) shows.

import { useState } from 'react';
import {
  type DimensionField,
  type Design,
  type EdgeProfile,
  type Grade,
  type Material,
  type Point,
  type ShapeKind,
  type SinkType,
  edgeProfile,
  fieldErrors,
  roundableCorners,
  roundedCornersOf,
  shapeToPolygon,
} from '../lib/geometry';

/** Extension used when switching to a shape whose extension is still empty. */
const DEFAULT_EXTENSION = 60;

export interface DesignState {
  /** Exactly what is typed in each box, so a field can be cleared and retyped. */
  inputs: Record<DimensionField, string>;
  /** The design as typed; may be invalid while typing. */
  draft: Design;
  /** The latest draft that was valid. The drawing shows this, so it doesn't flicker while typing. */
  design: Design;
}

const DIMENSIONS: DimensionField[] = ['length', 'depth', 'leftExtension', 'rightExtension'];

const toInputs = (d: Design) =>
  Object.fromEntries(DIMENSIONS.map((f) => [f, String(d[f])])) as Record<DimensionField, string>;

/** "" or text that isn't a number becomes NaN, which validation rejects. */
const parse = (text: string) => (text.trim() === '' ? NaN : Number(text));

function withDraft(state: DesignState, draft: Design, inputs = state.inputs): DesignState {
  const valid = Object.keys(fieldErrors(draft)).length === 0;
  return { inputs, draft, design: valid ? draft : state.design };
}

export function initialState(design: Design): DesignState {
  return { inputs: toInputs(design), draft: design, design };
}

export function setDimension(state: DesignState, field: DimensionField, text: string): DesignState {
  return withDraft(state, { ...state.draft, [field]: parse(text) }, { ...state.inputs, [field]: text });
}

export function setShape(state: DesignState, shape: ShapeKind): DesignState {
  const draft: Design = { ...state.draft, shape };
  if (shape !== 'rectangle' && !(draft.leftExtension > 0)) draft.leftExtension = DEFAULT_EXTENSION;
  if (shape === 'U' && !(draft.rightExtension > 0)) draft.rightExtension = DEFAULT_EXTENSION;
  const inputs = { ...state.inputs };
  for (const f of ['leftExtension', 'rightExtension'] as const) {
    if (draft[f] !== state.draft[f]) inputs[f] = String(draft[f]);
  }
  // The new shape has different edges; give its exposed ones the profile the old shape had.
  draft.edgeProfiles = withExposedProfile(draft, exposedProfile(state.design)).edgeProfiles;
  // Corner numbers mean different corners on each shape, so re-pick them for the new one.
  draft.roundedCorners = withCorners(draft, cornerStyle(state.design)).roundedCorners;
  return withDraft(state, draft, inputs);
}

export function setMaterial(state: DesignState, material: Material): DesignState {
  // Material is always valid, so apply it to the shown design too, even mid-typing.
  return { ...state, draft: { ...state.draft, material }, design: { ...state.design, material } };
}

/** Changes that are always valid go to both the typed draft and the shown design. */
function applyToBoth(state: DesignState, change: (d: Design) => Design): DesignState {
  return { ...state, draft: change(state.draft), design: change(state.design) };
}

/** The design with every exposed edge (not against a wall) set to the profile; wall edges stay Unfinished. */
function withExposedProfile(design: Design, profile: EdgeProfile): Design {
  const exposed = shapeToPolygon(design).edges.filter((e) => !e.againstWall);
  return { ...design, edgeProfiles: Object.fromEntries(exposed.map((e) => [e.id, profile])) };
}

/** One profile for all exposed edges. Per-edge choices may come back later; the data already allows it. */
export function setExposedEdges(state: DesignState, profile: EdgeProfile): DesignState {
  return applyToBoth(state, (d) => withExposedProfile(d, profile));
}

/** The profile the exposed edges have (they all share one); Eased if there are none. */
export function exposedProfile(design: Design): EdgeProfile {
  const edge = shapeToPolygon(design).edges.find((e) => !e.againstWall);
  return edge ? edgeProfile(design, edge) : 'Eased';
}

export type CornerStyle = 'Square' | 'Rounded';

/** The design with every corner that can be rounded set to the style. */
function withCorners(design: Design, style: CornerStyle): Design {
  return { ...design, roundedCorners: style === 'Rounded' ? roundableCorners(shapeToPolygon(design)) : [] };
}

/** One style for all corners that can be rounded, like edges. */
export function setCorners(state: DesignState, style: CornerStyle): DesignState {
  return applyToBoth(state, (d) => withCorners(d, style));
}

export function cornerStyle(design: Design): CornerStyle {
  return roundedCornersOf(design, shapeToPolygon(design)).length > 0 ? 'Rounded' : 'Square';
}

export function setGrade(state: DesignState, grade: Grade): DesignState {
  return applyToBoth(state, (d) => ({ ...d, grade }));
}

export function setSink(state: DesignState, sink: SinkType): DesignState {
  return applyToBoth(state, (d) => ({ ...d, sink }));
}

/** Where the sink was dragged to. Kept as asked; placeSink keeps it inside the counter when drawn. */
export function moveSink(state: DesignState, center: Point): DesignState {
  return applyToBoth(state, (d) => ({ ...d, sinkCenter: center }));
}

/** `initial` can be a function, so work like reading saved JSON happens only on the first render. */
export function useDesign(initial: Design | (() => Design)) {
  const [state, setState] = useState(() => initialState(typeof initial === 'function' ? initial() : initial));
  return {
    ...state,
    errors: fieldErrors(state.draft),
    setDimension: (field: DimensionField, text: string) => setState((s) => setDimension(s, field, text)),
    setShape: (shape: ShapeKind) => setState((s) => setShape(s, shape)),
    setMaterial: (material: Material) => setState((s) => setMaterial(s, material)),
    setGrade: (grade: Grade) => setState((s) => setGrade(s, grade)),
    setExposedEdges: (profile: EdgeProfile) => setState((s) => setExposedEdges(s, profile)),
    setCorners: (style: CornerStyle) => setState((s) => setCorners(s, style)),
    setSink: (sink: SinkType) => setState((s) => setSink(s, sink)),
    moveSink: (center: Point) => setState((s) => moveSink(s, center)),
  };
}
