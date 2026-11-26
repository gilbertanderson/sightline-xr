import { describe, expect, it } from 'vitest';
import { VENUE, SEAT_BY_ID } from './venue';
import { sightline } from './sightline';
import { bestAvailable } from './booking';
import { EVENTS, soldSeats } from './events';

const seat = (id: string) => {
  const s = SEAT_BY_ID.get(id);
  if (!s) throw new Error(`no seat ${id}`);
  return s;
};
const middle = (section: string, row: number) => {
  const inRow = VENUE.seats.filter((s) => s.section === section && s.row === row);
  return inRow[inRow.length - 1];
};

describe('venue', () => {
  it('builds 12 sections and a stable seat count', () => {
    expect(VENUE.sections).toHaveLength(12);
    expect(VENUE.seats.length).toBeGreaterThan(2000);
    expect(VENUE.seats.length).toBeLessThan(3200);
    expect(new Set(VENUE.seats.map((s) => s.id)).size).toBe(VENUE.seats.length);
  });
});

describe('sightline', () => {
  it('scores between 0 and 100', () => {
    for (const s of VENUE.seats) {
      const v = sightline(s).score;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
  it('rates a center orchestra seat above a far side seat', () => {
    const center = middle('102', 8); // inner section, seat nearest the center aisle
    const side = seat('101-8-1');
    expect(sightline(center).score).toBeGreaterThan(sightline(side).score + 10);
  });
  it('flags the balcony overhang for the back of the mezzanine', () => {
    const back = middle('202', 9);
    const s = sightline(back);
    expect(s.blockedScreen).toBeGreaterThan(0.3);
    expect(s.reason).toContain('balcony');
  });
  it('flags the speaker stacks for the front side seats', () => {
    const s = sightline(seat('101-20-1'));
    expect(s.blockedStage).toBeGreaterThan(0);
  });
});

describe('booking', () => {
  it('finds side-by-side available seats in one row', () => {
    const sold = soldSeats(EVENTS[2]);
    const group = bestAvailable(4, (i) => !sold.has(i), (s) => sightline(s).score);
    expect(group).not.toBeNull();
    const g = group!;
    expect(g).toHaveLength(4);
    for (let i = 1; i < g.length; i++) {
      expect(g[i].section).toBe(g[0].section);
      expect(g[i].row).toBe(g[0].row);
      expect(g[i].number).toBe(g[i - 1].number + 1);
      expect(sold.has(g[i].index)).toBe(false);
    }
  });
  it('returns null when nothing fits', () => {
    expect(bestAvailable(3, () => false, () => 1)).toBeNull();
  });
  it('keeps availability stable across builds', () => {
    expect(soldSeats(EVENTS[0]).size).toBe(soldSeats(EVENTS[0]).size);
  });
});
