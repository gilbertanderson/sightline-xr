import { BufferGeometry, CylinderGeometry, RingGeometry, BoxGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BALCONY } from '../data/venue';

const DEG = Math.PI / 180;
const SPAN = 52 * DEG;

/** A flat annular sector on the XZ plane, centered on the stage front, at height y. */
export function treadGeometry(r0: number, r1: number, y: number, span = SPAN) {
  const g = new RingGeometry(r0, r1, 48, 1, -Math.PI / 2 - span, 2 * span);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** A vertical curved band (riser face or rail) at radius r. */
export function bandGeometry(r: number, y0: number, h: number, span = SPAN) {
  const g = new CylinderGeometry(r, r, h, 48, 1, true, -span, 2 * span);
  g.translate(0, y0 + h / 2, 0);
  return g;
}

export function tieredFloor(rows: number, r0: number, depth: number, y0: number, rise: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < rows; i++) {
    const r = r0 + i * depth;
    const y = y0 + i * rise;
    parts.push(treadGeometry(r - depth / 2, r + depth / 2, y));
    if (rise > 0.001) parts.push(bandGeometry(r - depth / 2, y - rise, rise));
  }
  return mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
}

export function balconySlab(): BufferGeometry {
  const parts = [
    treadGeometry(BALCONY.rInner, BALCONY.rOuter, BALCONY.underside),
    bandGeometry(BALCONY.rInner, BALCONY.underside, BALCONY.top - BALCONY.underside),
  ];
  return mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
}

/** Seat: a cushion and a backrest. The sitter faces local -z. */
export function seatGeometry() {
  const cushion = new BoxGeometry(0.44, 0.1, 0.42);
  cushion.translate(0, 0.42, 0);
  const back = new BoxGeometry(0.44, 0.5, 0.07);
  back.translate(0, 0.66, 0.2);
  const base = new BoxGeometry(0.08, 0.38, 0.3);
  base.translate(0, 0.19, 0.02);
  return mergeGeometries([cushion, back, base])!;
}
