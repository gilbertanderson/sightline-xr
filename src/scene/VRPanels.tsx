import { useEffect, useState } from 'react';
import { VENUE } from '../data/venue';
import { EVENTS, EVENT_BY_ID } from '../data/events';
import { formatPrice } from '../data/booking';
import { useStore, sightOf, priceOf, type Feed } from '../store';
import { FONT } from './fonts';
import { Btn, Label, PanelBg } from './ui3d';

function useClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      useStore.getState().tick(Date.now());
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const W = 0.6;
const X0 = -W / 2 + 0.025;

function SeatCard({ y }: { y: number }) {
  const picked = useStore((s) => s.picked);
  const view = useStore((s) => s.view);
  const viewSeat = useStore((s) => s.viewSeat);
  const eventId = useStore((s) => s.eventId);
  const ev = EVENT_BY_ID.get(eventId)!;
  const idx = view === 'seat' ? viewSeat : picked[0];
  if (idx == null) return <Label position={[X0, y, 0]} color="#b9b2cc" maxWidth={W - 0.05}>Point at a colored seat and pull the trigger, or use Best available.</Label>;
  const s = VENUE.seats[idx];
  const sl = sightOf(idx);
  const total = picked.reduce((a, i) => a + priceOf(VENUE.seats[i], ev), 0);
  return (
    <group>
      <Label position={[X0, y, 0]} font={FONT.strong} size={0.019}>{`Section ${s.section} · Row ${s.row} · Seat ${s.number}${picked.length > 1 && view === 'map' ? `  (+${picked.length - 1})` : ''}`}</Label>
      <Label position={[X0, y - 0.03, 0]} color="#d8d2e6">{`${s.tier[0].toUpperCase() + s.tier.slice(1)} · ${formatPrice(ev.prices[s.tier])}${picked.length > 1 ? ` · ${picked.length} seats ${formatPrice(total)}` : ''} · Sightline ${sl.score}/100`}</Label>
      <Label position={[X0, y - 0.058, 0]} color="#b9b2cc" size={0.015} maxWidth={W - 0.05}>{sl.reason}</Label>
    </group>
  );
}

function CartRow({ y }: { y: number }) {
  const now = useClock();
  const hold = useStore((s) => s.hold);
  const checkout = useStore((s) => s.checkout);
  const order = useStore((s) => s.order);
  const picked = useStore((s) => s.picked);
  const eventId = useStore((s) => s.eventId);
  const ev = EVENT_BY_ID.get(eventId)!;
  const st = useStore.getState();
  if (checkout === 'done' && order) {
    return (
      <group>
        <Label position={[X0, y + 0.018, 0]} font={FONT.strong} color="#CC79A7">{`Booked ${order.number} · ${order.seats.length} seat${order.seats.length > 1 ? 's' : ''} · ${formatPrice(order.total)}`}</Label>
        <Label position={[X0, y - 0.012, 0]} color="#b9b2cc" size={0.014}>Demo ticket, not valid for entry. No payment was taken.</Label>
        <Btn label="Done" position={[W / 2 - 0.1, y - 0.055, 0]} w={0.15} onClick={st.closeTicket} />
      </group>
    );
  }
  if (checkout === 'review' && hold) {
    const total = hold.seats.reduce((a, i) => a + priceOf(VENUE.seats[i], ev), 0);
    return (
      <group>
        <Label position={[X0, y + 0.018, 0]} font={FONT.strong}>{`${hold.seats.length} seat${hold.seats.length > 1 ? 's' : ''} · ${formatPrice(total)} · demo checkout, no payment`}</Label>
        <Btn label="Confirm booking" position={[X0 + 0.1, y - 0.035, 0]} w={0.2} active onClick={st.confirm} />
        <Btn label="Cancel" position={[X0 + 0.31, y - 0.035, 0]} w={0.15} onClick={st.cancelCheckout} />
      </group>
    );
  }
  if (hold) {
    return (
      <group>
        <Label position={[X0, y + 0.018, 0]} font={FONT.strong} color="#F0E442">{`${hold.seats.length} seat${hold.seats.length > 1 ? 's' : ''} on hold · ${mmss(hold.expiresAt - now)} left`}</Label>
        <Btn label="Checkout" position={[X0 + 0.1, y - 0.035, 0]} w={0.2} active onClick={st.openCheckout} />
        <Btn label="Release" position={[X0 + 0.31, y - 0.035, 0]} w={0.15} onClick={st.releaseHold} />
      </group>
    );
  }
  return <Btn label={picked.length ? `Hold ${picked.length > 1 ? `${picked.length} seats` : 'seat'} for 10 min` : 'Pick a seat to hold it'} disabled={!picked.length} position={[X0 + 0.15, y - 0.01, 0]} w={0.3} onClick={st.holdPicked} />;
}

export function LoungePanel() {
  const eventId = useStore((s) => s.eventId);
  const groupSize = useStore((s) => s.groupSize);
  const picked = useStore((s) => s.picked);
  const compare = useStore((s) => s.compare);
  const sound = useStore((s) => s.sound);
  const notice = useStore((s) => s.notice);
  const ev = EVENT_BY_ID.get(eventId)!;
  const st = useStore.getState();
  return (
    <group>
      <PanelBg w={W} h={0.78} />
      <Label position={[X0, 0.37, 0]} font={FONT.display} size={0.026} color="#E69F00">SIGHTLINE XR</Label>
      <Label position={[X0 + 0.24, 0.366, 0]} size={0.013} color="#8d86a6">Larkspur Hall · fictional demo</Label>
      <Label position={[X0, 0.325, 0]} font={FONT.strong} size={0.022}>{ev.title}</Label>
      <Label position={[X0, 0.295, 0]} color="#b9b2cc" size={0.015}>{`${ev.kind} · ${ev.date} · doors ${ev.doors}`}</Label>
      {EVENTS.map((e, i) => (
        <Btn key={e.id} label={e.title} active={e.id === eventId} position={[X0 + 0.09 + i * 0.185, 0.24, 0]} w={0.175} onClick={() => st.setEvent(e.id)} />
      ))}
      <Label position={[X0, 0.193, 0]} color="#b9b2cc" size={0.015}>Group</Label>
      <Btn label="-" position={[X0 + 0.085, 0.18, 0]} w={0.05} onClick={() => st.setGroupSize(groupSize - 1)} />
      <Label position={[X0 + 0.122, 0.193, 0]} font={FONT.strong}>{String(groupSize)}</Label>
      <Btn label="+" position={[X0 + 0.165, 0.18, 0]} w={0.05} onClick={() => st.setGroupSize(groupSize + 1)} />
      <Btn label="Best available" position={[X0 + 0.3, 0.18, 0]} w={0.2} onClick={st.pickBest} />
      <Btn label={sound ? 'Sound on' : 'Sound off'} active={sound} position={[X0 + 0.47, 0.18, 0]} w={0.12} onClick={() => st.setSound(!sound)} />
      <SeatCard y={0.13} />
      <Btn label="Step into seat" disabled={!picked.length} active={!!picked.length} position={[X0 + 0.105, -0.025, 0]} w={0.21} onClick={() => st.stepIn()} />
      <Btn label={picked.length && compare.includes(picked[0]) ? 'Unpin' : `Pin to compare (${compare.length}/3)`} disabled={!picked.length} position={[X0 + 0.335, -0.025, 0]} w={0.23} onClick={() => st.togglePin(picked[0])} />
      <CartRow y={-0.1} />
      <Btn label="Turn left" position={[X0 + 0.08, -0.215, 0]} w={0.16} onClick={() => st.addSpin(0.35)} />
      <Btn label="Turn right" position={[X0 + 0.25, -0.215, 0]} w={0.16} onClick={() => st.addSpin(-0.35)} />
      {notice && <Label position={[X0, -0.26, 0]} color="#F0E442" size={0.014} maxWidth={W - 0.05}>{notice}</Label>}
      <Label position={[X0, -0.33, 0]} color="#6d6680" size={0.012} maxWidth={W - 0.05}>Drag the model or use the right thumbstick to turn it. Fictional venue and events; no real tickets or payments.</Label>
    </group>
  );
}

const FEEDS: [Feed, string][] = [
  ['wide', 'Wide'],
  ['close', 'Close-up'],
  ['crowd', 'Crowd'],
  ['section', 'Your section'],
];

export function SeatPanel() {
  const feed = useStore((s) => s.feed);
  const compare = useStore((s) => s.compare);
  const viewSeat = useStore((s) => s.viewSeat);
  const sound = useStore((s) => s.sound);
  const st = useStore.getState();
  return (
    <group>
      <PanelBg w={W} h={0.6} />
      <Label position={[X0, 0.28, 0]} font={FONT.display} size={0.022} color="#E69F00">YOUR VIEW</Label>
      <SeatCard y={0.24} />
      <Label position={[X0, 0.12, 0]} color="#b9b2cc" size={0.014}>Live broadcast</Label>
      {FEEDS.map(([f, label], i) => (
        <Btn key={f} label={label} active={feed === f} position={[X0 + 0.065 + i * 0.137, 0.075, 0]} w={0.13} onClick={() => st.setFeed(f)} />
      ))}
      {compare.length > 0 && <Label position={[X0, 0.03, 0]} color="#b9b2cc" size={0.014}>Compare pinned seats</Label>}
      {compare.map((idx, i) => {
        const s = VENUE.seats[idx];
        return <Btn key={idx} label={`${s.section}-${s.row}-${s.number} · ${sightOf(idx).score}`} active={viewSeat === idx} position={[X0 + 0.09 + i * 0.185, -0.015, 0]} w={0.175} onClick={() => st.stepIn(idx)} />;
      })}
      <CartRow y={-0.09} />
      <Btn label="Back to lounge" position={[X0 + 0.11, -0.22, 0]} w={0.22} onClick={st.backToMap} />
      <Btn label={sound ? 'Sound on' : 'Sound off'} active={sound} position={[X0 + 0.32, -0.22, 0]} w={0.16} onClick={() => st.setSound(!sound)} />
    </group>
  );
}
