/**
 * Procedural concert hall with an end stage.
 * Coordinates are meters. The stage front edge sits on z = 0 and the stage extends toward -z.
 * The audience sits at +z, in arcs centered on the stage front. Angle theta is measured
 * from +z toward +x, so +x is the audience's right when facing the stage.
 */
export type Level = 'Orchestra' | 'Mezzanine' | 'Balcony';
export type Tier = 'premium' | 'standard' | 'value';

export interface Seat {
  id: string;
  index: number;
  section: string;
  level: Level;
  row: number;
  number: number;
  x: number;
  y: number; // seat floor height
  z: number;
  theta: number; // radians
  yaw: number; // facing toward the stage, radians around +y
  tier: Tier;
}

export interface SectionInfo {
  name: string;
  level: Level;
  thetaMin: number;
  thetaMax: number;
}

export const STAGE = {
  width: 16,
  depth: 9,
  height: 1.2,
  focus: { x: 0, y: 2.6, z: -3.5 }, // where performers stand
  screen: { x: 0, y: 7.6, z: -8.6, w: 9, h: 5.06 },
};

export const BALCONY = { rInner: 19, rOuter: 30, underside: 5.6, top: 6.4, thetaMax: (52 * Math.PI) / 180 };

export const SPEAKERS = [-7.7, 7.7].map((x) => ({ x, yMin: STAGE.height, yMax: 5.4, z: 0.3, w: 1.3, d: 1.1 }));

export const EYE_HEIGHT = 1.15; // seated eye height above the seat floor

const DEG = Math.PI / 180;
const SPLITS = [-48, -24, 0, 24, 48].map((d) => d * DEG);

interface LevelSpec {
  level: Level;
  firstSection: number;
  rows: number;
  r0: number;
  rowDepth: number;
  y0: number;
  rise: number;
  spacing: number;
}

const LEVELS: LevelSpec[] = [
  { level: 'Orchestra', firstSection: 101, rows: 20, r0: 5.5, rowDepth: 0.9, y0: 0, rise: 0.12, spacing: 0.5 },
  { level: 'Mezzanine', firstSection: 201, rows: 14, r0: 23.5, rowDepth: 0.9, y0: 2.2, rise: 0.15, spacing: 0.5 },
  { level: 'Balcony', firstSection: 301, rows: 10, r0: 20, rowDepth: 0.85, y0: BALCONY.top, rise: 0.4, spacing: 0.5 },
];

function tierFor(level: Level, sectionIdx: number, row: number): Tier {
  const inner = sectionIdx === 1 || sectionIdx === 2;
  if (level === 'Orchestra') return inner && row <= 10 ? 'premium' : 'standard';
  if (level === 'Balcony') return inner && row <= 3 ? 'standard' : 'value';
  return inner && row <= 4 ? 'standard' : 'value';
}

export function buildVenue() {
  const seats: Seat[] = [];
  const sections: SectionInfo[] = [];
  for (const spec of LEVELS) {
    for (let s = 0; s < 4; s++) {
      const name = String(spec.firstSection + s);
      const t0 = SPLITS[s];
      const t1 = SPLITS[s + 1];
      sections.push({ name, level: spec.level, thetaMin: t0, thetaMax: t1 });
      for (let row = 1; row <= spec.rows; row++) {
        const r = spec.r0 + (row - 1) * spec.rowDepth;
        // leave a small aisle at each section edge
        const aisle = 0.6 / r;
        const span = t1 - t0 - 2 * aisle;
        const count = Math.max(2, Math.floor((span * r) / spec.spacing));
        const step = span / count;
        for (let n = 0; n < count; n++) {
          const theta = t0 + aisle + step * (n + 0.5);
          const x = r * Math.sin(theta);
          const z = r * Math.cos(theta);
          const y = spec.y0 + (row - 1) * spec.rise;
          const dx = STAGE.focus.x - x;
          const dz = STAGE.focus.z - z;
          seats.push({
            id: `${name}-${row}-${n + 1}`,
            index: seats.length,
            section: name,
            level: spec.level,
            row,
            number: n + 1,
            x,
            y,
            z,
            theta,
            yaw: Math.atan2(-dx, -dz),
            tier: tierFor(spec.level, s, row),
          });
        }
      }
    }
  }
  return { seats, sections };
}

export const VENUE = buildVenue();
export const SEAT_BY_ID = new Map(VENUE.seats.map((s) => [s.id, s]));

export const VENUE_NAME = 'Larkspur Hall';
