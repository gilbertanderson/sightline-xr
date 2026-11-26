import { VENUE, type Seat } from './venue';

export const HOLD_MS = 10 * 60 * 1000;

export type Availability = (index: number) => boolean;

/** Runs of `size` side-by-side available seats in one row of one section, best average score first. */
export function bestAvailable(size: number, isAvailable: Availability, scoreOf: (s: Seat) => number, seats: Seat[] = VENUE.seats): Seat[] | null {
  let best: { seats: Seat[]; avg: number } | null = null;
  let run: Seat[] = [];
  const flush = () => {
    for (let i = 0; i + size <= run.length; i++) {
      const group = run.slice(i, i + size);
      const avg = group.reduce((a, s) => a + scoreOf(s), 0) / size;
      if (!best || avg > best.avg) best = { seats: group, avg };
    }
    run = [];
  };
  for (let i = 0; i < seats.length; i++) {
    const s = seats[i];
    const prev = seats[i - 1];
    const sameRow = prev && prev.section === s.section && prev.row === s.row && prev.number === s.number - 1;
    if (!sameRow) flush();
    if (isAvailable(s.index)) run.push(s);
    else flush();
  }
  flush();
  return best ? (best as { seats: Seat[] }).seats : null;
}

export function formatPrice(n: number) {
  return `$${n.toLocaleString('en-US')}`;
}
