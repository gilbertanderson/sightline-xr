import { BALCONY, EYE_HEIGHT, SPEAKERS, STAGE, type Seat } from './venue';

/** All scoring weights in one place. They sum to 1. */
export const WEIGHTS = { distance: 0.35, angle: 0.25, tilt: 0.15, obstruction: 0.25 };

export interface Sightline {
  score: number; // 0 to 100
  distance: number; // meters from eye to the performers
  angleDeg: number; // how far off center, degrees
  tiltDeg: number; // + means looking up
  blockedStage: number; // share of stage sample rays blocked, 0 to 1
  blockedScreen: number; // share of screen sample rays blocked, 0 to 1
  reason: string;
}

type V3 = { x: number; y: number; z: number };

export function eyeOf(s: Seat): V3 {
  return { x: s.x, y: s.y + EYE_HEIGHT, z: s.z };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const STAGE_POINTS: V3[] = [];
for (const fx of [-0.4, 0, 0.4]) for (const fz of [-0.2, -0.55, -0.85]) STAGE_POINTS.push({ x: fx * STAGE.width, y: STAGE.height + 0.9, z: fz * STAGE.depth });
const SCREEN_POINTS: V3[] = [];
for (const fx of [-0.45, 0, 0.45]) for (const fy of [-0.4, 0.4]) SCREEN_POINTS.push({ x: STAGE.screen.x + fx * STAGE.screen.w, y: STAGE.screen.y + fy * STAGE.screen.h, z: STAGE.screen.z });

export type Obstacle = 'speaker' | 'overhang' | 'rail';
export const RAIL_HEIGHT = 0.75;

/** What solid thing, if any, occupies a point. */
export function solidAt(p: V3): Obstacle | null {
  for (const sp of SPEAKERS) {
    if (Math.abs(p.x - sp.x) < sp.w / 2 && Math.abs(p.z - sp.z) < sp.d / 2 && p.y > sp.yMin && p.y < sp.yMax) return 'speaker';
  }
  const r = Math.hypot(p.x, p.z);
  const theta = Math.atan2(p.x, p.z);
  if (p.z > 0 && Math.abs(theta) < BALCONY.thetaMax) {
    if (r > BALCONY.rInner && r < BALCONY.rOuter && p.y > BALCONY.underside && p.y < BALCONY.top) return 'overhang';
    if (r > BALCONY.rInner - 0.15 && r < BALCONY.rInner + 0.05 && p.y >= BALCONY.top && p.y < BALCONY.top + RAIL_HEIGHT) return 'rail';
  }
  return null;
}

function blocked(eye: V3, targets: V3[]) {
  const kinds: Record<Obstacle, number> = { speaker: 0, overhang: 0, rail: 0 };
  let n = 0;
  for (const t of targets) {
    const steps = 48;
    for (let i = 2; i < steps; i++) {
      const k = i / steps;
      const hit = solidAt({ x: eye.x + (t.x - eye.x) * k, y: eye.y + (t.y - eye.y) * k, z: eye.z + (t.z - eye.z) * k });
      if (hit) {
        n++;
        kinds[hit]++;
        break;
      }
    }
  }
  return { share: n / targets.length, kinds };
}

export function sightline(s: Seat): Sightline {
  const eye = eyeOf(s);
  const f = STAGE.focus;
  const horiz = Math.hypot(f.x - eye.x, f.z - eye.z);
  const distance = Math.hypot(horiz, f.y - eye.y);
  const angleDeg = Math.abs((s.theta * 180) / Math.PI);
  const tiltDeg = (Math.atan2(f.y - eye.y, horiz) * 180) / Math.PI;
  const st = blocked(eye, STAGE_POINTS);
  const sc = blocked(eye, SCREEN_POINTS);
  const blockedStage = st.share;
  const blockedScreen = sc.share;

  const dScore = clamp01(1 - (distance - 9) / 26);
  const aScore = clamp01(1 - (angleDeg - 12) / 40);
  const tScore = tiltDeg > 0 ? clamp01(1 - (tiltDeg - 6) / 18) : clamp01(1 - (-tiltDeg - 12) / 22);
  const oScore = clamp01(1 - (blockedStage * 0.7 + blockedScreen * 0.3) * 1.6);
  const score = Math.round(100 * (WEIGHTS.distance * dScore + WEIGHTS.angle * aScore + WEIGHTS.tilt * tScore + WEIGHTS.obstruction * oScore));

  return { score, distance, angleDeg, tiltDeg, blockedStage, blockedScreen, reason: reasonFor(s, distance, angleDeg, tiltDeg, blockedStage, blockedScreen, st.kinds) };
}

function reasonFor(s: Seat, distance: number, angleDeg: number, tiltDeg: number, blockedStage: number, blockedScreen: number, kinds: Record<Obstacle, number>): string {
  const near = distance < 13 ? 'Close' : distance < 22 ? 'Mid-hall' : 'Far back';
  const side = s.theta > 0 ? 'right' : 'left';
  const where = angleDeg < 14 ? 'centered' : angleDeg < 32 ? `a little to the ${side}` : `far to the ${side}`;
  const issues: string[] = [];
  if (blockedStage > 0.2) {
    const top = (Object.keys(kinds) as Obstacle[]).sort((a, b) => kinds[b] - kinds[a])[0];
    const big = blockedStage > 0.4;
    if (top === 'speaker') issues.push(big ? 'a speaker stack blocks a big part of the stage' : 'a speaker stack clips the edge of the stage');
    else if (top === 'rail') issues.push(big ? 'the balcony rail cuts across the stage' : 'the balcony rail clips the front of the stage');
    else issues.push('the balcony overhang hides part of the stage');
  }
  if (blockedScreen > 0.3) issues.push('the balcony cuts off the top of the screen');
  if (tiltDeg > 14) issues.push("you'll look up at the stage");
  if (tiltDeg < -24) issues.push('a steep view down onto the stage');
  if (!issues.length) return `${near} and ${where}, with a clear view of the stage and screen.`;
  return `${near} and ${where}, but ${issues.join(' and ')}.`;
}
