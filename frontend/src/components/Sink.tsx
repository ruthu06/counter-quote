// The sink on the drawing. Drag it (or Tab to it and use the arrow keys) to move it;
// placeSink keeps it inside the counter. Where it sits is visual only and doesn't change the price.

import { type KeyboardEvent, type PointerEvent, useRef } from 'react';
import { type Design, type Point, placeSink } from '../lib/geometry';
import styles from './Sink.module.css';

const COLORS = { line: '#6b7785', rim: '#e4e8ec', bowl: '#ffffff' };
/** Arrow keys move the sink 1"; with Shift, 6". */
const KEY_STEP = { normal: 1, shift: 6 };

interface SinkProps {
  design: Design;
  /** Called with the new centre while dragging. Without it the sink is display-only. */
  onMove?: (center: Point) => void;
}

export function Sink({ design, onMove }: SinkProps) {
  // Offset from the pointer to the sink's centre, so it doesn't jump to the pointer when grabbed.
  const grab = useRef<Point | null>(null);
  if (design.sink === 'None') return null;

  const { center, width, height } = placeSink(design);
  // Store where it actually lands, so dragging far outside the counter doesn't leave a far-off position behind.
  const moveTo = (wanted: Point) => onMove?.(placeSink({ ...design, sinkCenter: wanted }).center);

  /**
   * Screen pixels to this countertop's inches. Uses the sink's own position on screen, so it's
   * right even when the countertop is shifted along to sit beside others.
   */
  const toDrawing = (event: PointerEvent<SVGGElement>): Point => {
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(event.currentTarget.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  const onPointerDown = (event: PointerEvent<SVGGElement>) => {
    event.stopPropagation(); // move the sink, not the whole countertop
    const p = toDrawing(event);
    grab.current = { x: center.x - p.x, y: center.y - p.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGGElement>) => {
    if (!grab.current) return;
    const p = toDrawing(event);
    moveTo({ x: p.x + grab.current.x, y: p.y + grab.current.y });
  };
  const onPointerUp = () => {
    grab.current = null;
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.shiftKey ? KEY_STEP.shift : KEY_STEP.normal;
    const moves: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveTo({ x: center.x + move.x, y: center.y + move.y });
  };

  const x = center.x - width / 2;
  const y = center.y - height / 2;
  const name = `${design.sink} sink`;

  return (
    <g
      className={onMove ? styles.sink : undefined}
      {...(onMove && {
        tabIndex: 0,
        role: 'button',
        'aria-label': `${name}. Drag, or use the arrow keys, to move it.`,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
        onKeyDown,
      })}
    >
      <title>{onMove ? `${name}: drag to move` : name}</title>
      {design.sink === 'Drop-in' ? (
        <>
          {/* Drop-in: the sink's rim rests on top of the stone, so it's drawn as a band around the bowl. */}
          <rect x={x - 1} y={y - 1} width={width + 2} height={height + 2} rx={3} fill={COLORS.rim} stroke={COLORS.line} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          <rect className={styles.bowl} x={x + 1} y={y + 1} width={width - 2} height={height - 2} rx={2} fill={COLORS.bowl} stroke={COLORS.line} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </>
      ) : (
        // Undermount: the sink is under the stone, so only the polished cutout edge shows.
        <rect className={styles.bowl} x={x} y={y} width={width} height={height} rx={3} fill={COLORS.bowl} stroke={COLORS.line} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      )}
      {/* Drain */}
      <circle cx={center.x} cy={center.y} r={Math.min(width, height) * 0.07} fill={COLORS.line} />
    </g>
  );
}
