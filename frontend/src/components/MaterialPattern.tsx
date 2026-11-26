import type { Material } from '../lib/geometry';
import { MATERIAL_TILES } from '../lib/materials';

/** One SVG <pattern> that suggests the stone; fill a shape with url(#id). Place inside <defs>. */
export function MaterialPattern({ id, material }: { id: string; material: Material }) {
  const tile = MATERIAL_TILES[material];
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={tile.width} height={tile.height}>
      <rect width={tile.width} height={tile.height} fill={tile.base} />
      {tile.speckles.map((s, i) => (
        <circle key={`s${i}`} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} />
      ))}
      {tile.veins.map((v, i) => (
        <polyline
          key={`v${i}`}
          points={v.points}
          transform={`translate(0 ${v.dy})`}
          fill="none"
          stroke={v.color}
          strokeWidth={v.width}
          strokeOpacity={v.opacity}
          strokeLinecap="round"
        />
      ))}
    </pattern>
  );
}
