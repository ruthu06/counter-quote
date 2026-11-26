// Editing one design: what is typed in each box, any errors, and the last valid design,
// which is what the drawing and the price show. Plain functions, so they're easy to test;
// designApi() binds them to where the state is kept (see hooks/useJobDesign).

import {
  type DimensionField,
  type Design,
  type EdgeProfile,
  type Grade,
  type Material,
  type Point,
  type ShapeKind,
  type SinkType,
  fieldErrors,
} from './geometry';

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
  // Edge profile and corner style apply to whatever edges and corners the new shape has.
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

/** The profile for every exposed edge (wall edges stay Unfinished). */
export function setExposedEdges(state: DesignState, profile: EdgeProfile): DesignState {
  return applyToBoth(state, (d) => ({ ...d, edgeProfile: profile }));
}

export type CornerStyle = 'Square' | 'Rounded';

/** Rounded rounds every corner that can be rounded; Square leaves them all square. */
export function setCorners(state: DesignState, style: CornerStyle): DesignState {
  return applyToBoth(state, (d) => ({ ...d, roundedCorners: style === 'Rounded' }));
}

export const cornerStyle = (design: Design): CornerStyle => (design.roundedCorners ? 'Rounded' : 'Square');

export function setGrade(state: DesignState, grade: Grade): DesignState {
  return applyToBoth(state, (d) => ({ ...d, grade }));
}

export function setSink(state: DesignState, sink: SinkType): DesignState {
  return applyToBoth(state, (d) => ({ ...d, sink }));
}

/**
 * Freestanding (an island) or against the walls. The edge profile and corner style then apply
 * to whichever edges and corners are exposed, so nothing else needs changing.
 */
export function setFreestanding(state: DesignState, freestanding: boolean): DesignState {
  return applyToBoth(state, (d) => ({ ...d, freestanding }));
}

/** Where the sink was dragged to. Kept as asked; placeSink keeps it inside the counter when drawn. */
export function moveSink(state: DesignState, center: Point): DesignState {
  return applyToBoth(state, (d) => ({ ...d, sinkCenter: center }));
}

/** Every editing action for one design, bound to wherever its state lives. */
export interface DesignApi extends DesignState {
  /** One message per measurement box that is wrong. */
  errors: Partial<Record<DimensionField, string>>;
  setDimension: (field: DimensionField, text: string) => void;
  setShape: (shape: ShapeKind) => void;
  setMaterial: (material: Material) => void;
  setGrade: (grade: Grade) => void;
  setExposedEdges: (profile: EdgeProfile) => void;
  setCorners: (style: CornerStyle) => void;
  setFreestanding: (freestanding: boolean) => void;
  setSink: (sink: SinkType) => void;
  moveSink: (center: Point) => void;
}

/**
 * Wraps a design's state and an update function into the actions the controls call.
 * The state can live anywhere: useJobDesign keeps one per countertop.
 */
export function designApi(state: DesignState, update: (change: (s: DesignState) => DesignState) => void): DesignApi {
  return {
    ...state,
    errors: fieldErrors(state.draft),
    setDimension: (field, text) => update((s) => setDimension(s, field, text)),
    setShape: (shape) => update((s) => setShape(s, shape)),
    setMaterial: (material) => update((s) => setMaterial(s, material)),
    setGrade: (grade) => update((s) => setGrade(s, grade)),
    setExposedEdges: (profile) => update((s) => setExposedEdges(s, profile)),
    setCorners: (style) => update((s) => setCorners(s, style)),
    setFreestanding: (freestanding) => update((s) => setFreestanding(s, freestanding)),
    setSink: (sink) => update((s) => setSink(s, sink)),
    moveSink: (center) => update((s) => moveSink(s, center)),
  };
}
