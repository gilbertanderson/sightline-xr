import { rng, hashString } from './rng';
import { VENUE, type Tier } from './venue';

export interface EventInfo {
  id: string;
  title: string;
  kind: string;
  date: string;
  doors: string;
  soldShare: number;
  prices: Record<Tier, number>;
  hue: number; // stage lighting hue, 0 to 1
}

/** Fictional shows at a fictional venue. */
export const EVENTS: EventInfo[] = [
  { id: 'neon-tides', title: 'Neon Tides', kind: 'Synthwave live set', date: 'Fri, Jan 15, 2027', doors: '7:30 PM', soldShare: 0.55, prices: { premium: 189, standard: 119, value: 69 }, hue: 0.83 },
  { id: 'midnight-strings', title: 'Midnight Strings', kind: 'Chamber quartet', date: 'Sat, Jan 23, 2027', doors: '8:00 PM', soldShare: 0.3, prices: { premium: 129, standard: 89, value: 49 }, hue: 0.1 },
  { id: 'echo-parade', title: 'Echo Parade', kind: 'Indie rock double bill', date: 'Fri, Feb 5, 2027', doors: '7:00 PM', soldShare: 0.72, prices: { premium: 149, standard: 99, value: 59 }, hue: 0.55 },
];

export const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));

/** Seats sold before the visitor arrives. Sales cluster near the front and center, like a real on-sale. */
export function soldSeats(ev: EventInfo): Set<number> {
  const rand = rng(hashString(ev.id));
  const sold = new Set<number>();
  for (const s of VENUE.seats) {
    const pull = s.tier === 'premium' ? 1.35 : s.tier === 'standard' ? 1 : 0.7;
    if (rand() < ev.soldShare * pull) sold.add(s.index);
  }
  return sold;
}
