import { create } from 'zustand';
import { EVENTS, EVENT_BY_ID, soldSeats, type EventInfo } from './data/events';
import { VENUE, type Seat } from './data/venue';
import { sightline, type Sightline } from './data/sightline';
import { bestAvailable, HOLD_MS } from './data/booking';

export type Feed = 'wide' | 'close' | 'crowd' | 'section';
export type View = 'map' | 'seat';
export type Checkout = 'none' | 'review' | 'done';

const scoreCache = new Map<number, Sightline>();
export function sightOf(index: number): Sightline {
  let v = scoreCache.get(index);
  if (!v) {
    v = sightline(VENUE.seats[index]);
    scoreCache.set(index, v);
  }
  return v;
}

const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const lightHardware = typeof navigator !== 'undefined' && /OculusBrowser|Quest|Mobile/i.test(navigator.userAgent);

export interface Order {
  number: string;
  eventId: string;
  seats: number[];
  total: number;
}

interface State {
  eventId: string;
  sold: Set<number>;
  owned: Set<number>;
  picked: number[];
  hover: number | null;
  compare: number[];
  view: View;
  viewSeat: number | null;
  feed: Feed;
  groupSize: number;
  hold: { seats: number[]; expiresAt: number } | null;
  checkout: Checkout;
  order: Order | null;
  sound: boolean;
  quality: 'high' | 'low';
  reducedMotion: boolean;
  notice: string | null;
  spin: number;
  setEvent: (id: string) => void;
  pick: (index: number) => void;
  setHover: (index: number | null) => void;
  pickBest: () => void;
  setGroupSize: (n: number) => void;
  stepIn: (index?: number) => void;
  backToMap: () => void;
  togglePin: (index: number) => void;
  setFeed: (f: Feed) => void;
  holdPicked: () => void;
  releaseHold: () => void;
  tick: (now: number) => void;
  openCheckout: () => void;
  cancelCheckout: () => void;
  confirm: () => void;
  closeTicket: () => void;
  setSound: (on: boolean) => void;
  setQuality: (q: 'high' | 'low') => void;
  addSpin: (d: number) => void;
}

export const event = (): EventInfo => EVENT_BY_ID.get(useStore.getState().eventId)!;
export const priceOf = (s: Seat, ev: EventInfo = event()) => ev.prices[s.tier];

export const useStore = create<State>((set, get) => ({
  eventId: EVENTS[0].id,
  sold: soldSeats(EVENTS[0]),
  owned: new Set(),
  picked: [],
  hover: null,
  compare: [],
  view: 'map',
  viewSeat: null,
  feed: 'wide',
  groupSize: 2,
  hold: null,
  checkout: 'none',
  order: null,
  sound: false,
  quality: lightHardware ? 'low' : 'high',
  reducedMotion,
  notice: null,
  spin: 0,

  setEvent: (id) => {
    const ev = EVENT_BY_ID.get(id);
    if (!ev) return;
    set({ eventId: id, sold: soldSeats(ev), owned: new Set(), picked: [], compare: [], hold: null, checkout: 'none', order: null, view: 'map', viewSeat: null, notice: null });
  },
  pick: (index) => {
    const { sold, owned, hold } = get();
    if (sold.has(index) || owned.has(index)) {
      set({ notice: 'That seat is already taken. Pick a colored seat.' });
      return;
    }
    if (hold) {
      set({ notice: 'You have seats on hold. Release them to pick different seats.' });
      return;
    }
    set({ picked: [index], viewSeat: get().view === 'seat' ? index : get().viewSeat, notice: null });
  },
  setHover: (index) => set({ hover: index }),
  pickBest: () => {
    const { sold, owned, groupSize, hold } = get();
    if (hold) return;
    const group = bestAvailable(groupSize, (i) => !sold.has(i) && !owned.has(i), (s) => sightOf(s.index).score);
    if (!group) set({ notice: `No ${groupSize} seats together are left for this show.` });
    else set({ picked: group.map((s) => s.index), notice: null });
  },
  setGroupSize: (n) => set({ groupSize: Math.max(1, Math.min(6, n)) }),
  stepIn: (index) => {
    const target = index ?? get().picked[0] ?? null;
    if (target == null) return;
    const { picked, hold, sold, owned } = get();
    const repick = index != null && !picked.includes(index) && !hold && !sold.has(index) && !owned.has(index);
    set({ view: 'seat', viewSeat: target, picked: repick ? [index] : picked, feed: get().feed === 'wide' ? 'close' : get().feed });
  },
  backToMap: () => set({ view: 'map' }),
  togglePin: (index) => {
    const c = get().compare;
    if (c.includes(index)) set({ compare: c.filter((i) => i !== index) });
    else if (c.length < 3) set({ compare: [...c, index] });
    else set({ notice: 'You can compare up to 3 seats. Unpin one first.' });
  },
  setFeed: (feed) => set({ feed }),
  holdPicked: () => {
    const { picked } = get();
    if (!picked.length) return;
    set({ hold: { seats: picked, expiresAt: Date.now() + HOLD_MS }, notice: null });
  },
  releaseHold: () => set({ hold: null, checkout: 'none' }),
  tick: (now) => {
    const { hold } = get();
    if (hold && now >= hold.expiresAt) set({ hold: null, checkout: 'none', notice: 'Your hold ran out, so those seats went back on sale.' });
  },
  openCheckout: () => {
    if (!get().hold) get().holdPicked();
    if (get().hold) set({ checkout: 'review' });
  },
  cancelCheckout: () => set({ checkout: 'none' }),
  confirm: () => {
    const { hold, owned, eventId } = get();
    if (!hold) return;
    const ev = EVENT_BY_ID.get(eventId)!;
    const total = hold.seats.reduce((a, i) => a + priceOf(VENUE.seats[i], ev), 0);
    const number = 'DEMO-' + Math.floor(100000 + Math.random() * 900000);
    const nextOwned = new Set(owned);
    hold.seats.forEach((i) => nextOwned.add(i));
    set({ owned: nextOwned, order: { number, eventId, seats: hold.seats, total }, hold: null, picked: [], checkout: 'done' });
  },
  closeTicket: () => set({ checkout: 'none' }),
  setSound: (sound) => set({ sound }),
  setQuality: (quality) => set({ quality }),
  addSpin: (d) => set({ spin: get().spin + d }),
}));

export function seatLabel(s: Seat) {
  return `Section ${s.section} · Row ${s.row} · Seat ${s.number}`;
}
