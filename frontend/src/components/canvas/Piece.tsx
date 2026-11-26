// One countertop on the plan: MovablePiece places it and handles click/drag/keys;
// Piece draws it (stone, edges, corners, and for the selected one dimensions, sink and handles).

import { type KeyboardEvent, type PointerEvent, type ReactNode, useRef, useState } from 'react';
import {
  type Design,
  type DimensionField,
  type Edge,
  type Point,
  cornerArcPath,
  edgeProfile,
  formatInches,
  outlinePath,
  roundedCornersOf,
  shapeToPolygon,
} from '../../lib/geometry';
import { ResizeHandles } from '../ResizeHandles';
import { Sink } from '../Sink';
import { COLORS, PROFILE_COLORS } from './colors';
import { DimensionLine, mainDimensions } from './Dimensions';
import styles from './Piece.module.css';
import { EdgeLength, EdgeLine, WallStrip, straightPart } from './svgParts';

/** One countertop to draw, and where its top-left corner sits on the plan (inches). */
export interface CanvasPiece {
  id: string;
  name: string;
  design: Design;
  position: Point;
}

/** Arrow keys move a focused countertop 1"; with Shift, 1 ft. */
const PIECE_KEY_STEP = { normal: 1, shift: 12 };

/**
 * Wraps one countertop: places it on the plan, selects it on click, and moves it when dragged
 * (or with the arrow keys when focused). Like the resize handles, a drag is measured in screen
 * pixels from where it was grabbed, so re-fitting the zoom while it moves can't make it run away.
 */
export function MovablePiece(props: {
  piece: CanvasPiece;
  selected: boolean;
  onSelect?: (id: string) => void;
  onMove?: (id: string, to: Point) => void;
  children: ReactNode;
}) {
  const { piece, selected, onSelect, onMove, children } = props;
  const grab = useRef<{ x: number; y: number; from: Point; pxPerInch: number } | null>(null);

  const onPointerDown = (event: PointerEvent<SVGGElement>) => {
    onSelect?.(piece.id);
    if (!onMove) return;
    const ctm = event.currentTarget.ownerSVGElement!.getScreenCTM()!;
    grab.current = { x: event.clientX, y: event.clientY, from: piece.position, pxPerInch: ctm.a };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGGElement>) => {
    const g = grab.current;
    if (!g || !onMove) return;
    onMove(piece.id, { x: g.from.x + (event.clientX - g.x) / g.pxPerInch, y: g.from.y + (event.clientY - g.y) / g.pxPerInch });
  };
  const release = () => {
    grab.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.target !== event.currentTarget) return; // keys on the sink or a handle are theirs
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(piece.id);
      return;
    }
    const step = event.shiftKey ? PIECE_KEY_STEP.shift : PIECE_KEY_STEP.normal;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (!delta || !onMove) return;
    event.preventDefault();
    onMove(piece.id, { x: piece.position.x + delta[0], y: piece.position.y + delta[1] });
  };

  return (
    <g
      transform={`translate(${piece.position.x} ${piece.position.y})`}
      className={onMove ? styles.piece : undefined}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${piece.name || 'Countertop'}. ${selected ? 'Selected.' : 'Click to edit.'}${onMove ? ' Drag, or use the arrow keys, to move it.' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={onKeyDown}
    >
      {children}
    </g>
  );
}

/**
 * One countertop in its real look: stone, rounded corners, edge finishes and sink. The selected one
 * also shows dimensions, edge lengths on hover, the draggable sink and the resize handles; the
 * others show their name instead. A red outline marks a countertop that overlaps another.
 */
export function Piece(props: {
  design: Design;
  selected: boolean;
  name: string;
  clash: boolean;
  text: number;
  gap: number;
  fill: string;
  wallFill: string;
  onMoveSink?: (center: Point) => void;
  onResize?: (field: DimensionField, value: number) => void;
}) {
  const { design, selected, name, clash, text, gap, fill, wallFill, onMoveSink, onResize } = props;
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const outline = shapeToPolygon(design);
  const { dimensions, shownEdgeIds } = mainDimensions(design, outline.edges, gap);
  const hover = selected ? outline.edges.find((e) => e.id === hoveredEdge) : undefined;
  const rounded = roundedCornersOf(design, outline);
  // Edge i runs from corner i to corner i + 1; lines along it stop where a rounded corner's curve starts.
  const straight = (e: Edge) => {
    const i = outline.edges.indexOf(e);
    return straightPart(e, rounded.includes(i), rounded.includes((i + 1) % outline.points.length));
  };

  return (
    <>
      <path d={outlinePath(outline, rounded)} fill={fill} stroke={COLORS.outline} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />

      {/* Edge finishes: a hatched wall strip outside Unfinished edges, a coloured line on paid profiles. */}
      {outline.edges.map((e) => {
        const profile = edgeProfile(design, e);
        if (profile === 'Unfinished') return <WallStrip key={e.id} edge={e} depth={text * 0.45} fill={wallFill} />;
        const color = PROFILE_COLORS[profile];
        return color && <EdgeLine key={e.id} edge={straight(e)} color={color} width={3} />;
      })}
      {/* A rounded corner's curve takes the colour of the edge leading into it (both its edges are exposed). */}
      {rounded.map((i) => {
        const incoming = outline.edges[(i - 1 + outline.points.length) % outline.points.length];
        const color = PROFILE_COLORS[edgeProfile(design, incoming)];
        return (
          color && (
            <path key={`corner-${i}`} d={cornerArcPath(outline, i)} fill="none" stroke={color} strokeWidth={3}
              strokeLinecap="round" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )
        );
      })}
      {clash && (
        <path d={outlinePath(outline, rounded)} fill="none" stroke={COLORS.clash} strokeWidth={3} vectorEffect="non-scaling-stroke" pointerEvents="none" />
      )}

      {selected ? (
        <>
          {dimensions.map((d) => (
            <DimensionLine key={`${d.side}-${d.label}`} dimension={d} text={text} />
          ))}

          {hover && <EdgeLine edge={straight(hover)} color={COLORS.hover} width={3} />}
          {/* Edges without a dimension line show their length while hovered. */}
          {hover && !shownEdgeIds.has(hover.id) && <EdgeLength edge={hover} text={text} />}

          {/* Wide invisible lines on top, so edges are easy to hover. */}
          {outline.edges.map((e) => (
            <line
              key={e.id}
              x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y}
              stroke="transparent"
              strokeWidth={14}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="stroke"
              onMouseEnter={() => setHoveredEdge(e.id)}
              onMouseLeave={() => setHoveredEdge(null)}
            >
              <title>{`${e.label}: ${formatInches(e.length)}, ${edgeProfile(design, e)}`}</title>
            </line>
          ))}
        </>
      ) : (
        // The middle of the back run is inside every shape, so the name always sits on the stone.
        <text className={styles.name} x={design.length / 2} y={design.depth / 2} fontSize={text * 0.9}
          textAnchor="middle" dominantBaseline="central">
          {name}
        </text>
      )}

      {/* Last, so they sit above everything else and can be grabbed. */}
      <Sink design={design} onMove={onMoveSink} />
      {onResize && <ResizeHandles design={design} radius={text * 0.4} onResize={onResize} />}
    </>
  );
}
