import { useEffect, useState } from 'react';
import { VENUE, VENUE_NAME } from '../data/venue';
import { EVENTS, EVENT_BY_ID } from '../data/events';
import { formatPrice } from '../data/booking';
import { useStore, sightOf, priceOf, seatLabel, type Feed } from '../store';
import { SEAT_COLORS } from '../scene/palette';

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function useNow() {
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

function Score({ value }: { value: number }) {
  return (
    <div className="score" aria-label={`Sightline score ${value} out of 100`}>
      <div className="score-num">{value}</div>
      <div className="score-bar"><span style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function SeatCard() {
  const picked = useStore((s) => s.picked);
  const view = useStore((s) => s.view);
  const viewSeat = useStore((s) => s.viewSeat);
  const compare = useStore((s) => s.compare);
  const hold = useStore((s) => s.hold);
  const eventId = useStore((s) => s.eventId);
  const ev = EVENT_BY_ID.get(eventId)!;
  const st = useStore.getState();
  const idx = view === 'seat' ? viewSeat : picked[0];
  if (idx == null) {
    return (
      <section className="card empty">
        <h3>Pick a seat</h3>
        <p>Click any colored seat in the hall, or let Best available find seats together for your group.</p>
      </section>
    );
  }
  const s = VENUE.seats[idx];
  const sl = sightOf(idx);
  const total = picked.reduce((a, i) => a + priceOf(VENUE.seats[i], ev), 0);
  return (
    <section className="card" aria-live="polite">
      <div className="card-head">
        <div>
          <h3>{seatLabel(s)}</h3>
          <p className="meta">
            <span className="dot" style={{ background: SEAT_COLORS[s.tier] }} /> {s.tier[0].toUpperCase() + s.tier.slice(1)} · {s.level} · {formatPrice(ev.prices[s.tier])}
            {picked.length > 1 && view === 'map' && <> · {picked.length} seats together, {formatPrice(total)}</>}
          </p>
        </div>
        <Score value={sl.score} />
      </div>
      <p className="reason">{sl.reason}</p>
      <div className="row">
        {view === 'map' ? (
          <button className="primary" onClick={() => st.stepIn(idx)}>Step into seat</button>
        ) : (
          <button className="primary" onClick={st.backToMap}>Back to the map</button>
        )}
        <button onClick={() => st.togglePin(idx)} aria-pressed={compare.includes(idx)} disabled={!!hold && !hold.seats.includes(idx)}>
          {compare.includes(idx) ? 'Unpin' : `Compare (${compare.length}/3)`}
        </button>
      </div>
    </section>
  );
}

function Compare() {
  const compare = useStore((s) => s.compare);
  const viewSeat = useStore((s) => s.viewSeat);
  const view = useStore((s) => s.view);
  if (!compare.length) return null;
  return (
    <section className="compare">
      <h4>Compare seats</h4>
      <div className="chips">
        {compare.map((i) => {
          const s = VENUE.seats[i];
          return (
            <button key={i} className="chip" aria-current={view === 'seat' && viewSeat === i} onClick={() => useStore.getState().stepIn(i)}>
              <strong>{s.section}</strong> Row {s.row} · Seat {s.number}
              <span className="chip-score">{sightOf(i).score}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Cart() {
  const now = useNow();
  const hold = useStore((s) => s.hold);
  const picked = useStore((s) => s.picked);
  const eventId = useStore((s) => s.eventId);
  const ev = EVENT_BY_ID.get(eventId)!;
  const st = useStore.getState();
  if (hold) {
    const total = hold.seats.reduce((a, i) => a + priceOf(VENUE.seats[i], ev), 0);
    return (
      <section className="cart held">
        <div>
          <strong>{hold.seats.length} seat{hold.seats.length > 1 ? 's' : ''} on hold · {formatPrice(total)}</strong>
          <span className="timer">{mmss(hold.expiresAt - now)} left</span>
        </div>
        <div className="row">
          <button className="primary" onClick={st.openCheckout}>Checkout</button>
          <button onClick={st.releaseHold}>Release</button>
        </div>
      </section>
    );
  }
  return (
    <section className="cart">
      <button className="primary wide" disabled={!picked.length} onClick={st.holdPicked}>
        {picked.length ? `Hold ${picked.length > 1 ? `these ${picked.length} seats` : 'this seat'} for 10 minutes` : 'Pick a seat to hold it'}
      </button>
    </section>
  );
}

export function Panel() {
  const eventId = useStore((s) => s.eventId);
  const groupSize = useStore((s) => s.groupSize);
  const notice = useStore((s) => s.notice);
  const hold = useStore((s) => s.hold);
  const ev = EVENT_BY_ID.get(eventId)!;
  const st = useStore.getState();
  return (
    <aside aria-label="Booking">
      <div className="events" role="tablist" aria-label="Shows">
        {EVENTS.map((e) => (
          <button key={e.id} role="tab" aria-selected={e.id === eventId} onClick={() => st.setEvent(e.id)}>
            <span className="ev-title">{e.title}</span>
            <span className="ev-date">{e.date}</span>
          </button>
        ))}
      </div>
      <div className="scroll">
        <p className="ev-kind">{ev.kind} at {VENUE_NAME} · doors {ev.doors}</p>
        <ul className="legend" aria-label="Seat colors">
          {(['premium', 'standard', 'value'] as const).map((t) => (
            <li key={t}><span className="dot" style={{ background: SEAT_COLORS[t] }} />{t[0].toUpperCase() + t.slice(1)} {formatPrice(ev.prices[t])}</li>
          ))}
          <li><span className="dot" style={{ background: SEAT_COLORS.sold }} />Sold</li>
          <li><span className="dot" style={{ background: SEAT_COLORS.held }} />On hold</li>
          <li><span className="dot" style={{ background: SEAT_COLORS.owned }} />Yours</li>
        </ul>
        <div className="group">
          <span>Group</span>
          <button aria-label="Fewer seats" onClick={() => st.setGroupSize(groupSize - 1)} disabled={groupSize <= 1}>−</button>
          <output aria-live="polite">{groupSize}</output>
          <button aria-label="More seats" onClick={() => st.setGroupSize(groupSize + 1)} disabled={groupSize >= 6}>+</button>
          <button className="best" onClick={st.pickBest} disabled={!!hold}>Best available</button>
        </div>
        <SeatCard />
        <Compare />
        {notice && <p className="notice" role="status">{notice}</p>}
      </div>
      <Cart />
    </aside>
  );
}

const FEEDS: [Feed, string][] = [
  ['wide', 'Wide'],
  ['close', 'Close-up'],
  ['crowd', 'Crowd'],
  ['section', 'Your section'],
];

export function BroadcastBar() {
  const feed = useStore((s) => s.feed);
  const sound = useStore((s) => s.sound);
  const quality = useStore((s) => s.quality);
  const view = useStore((s) => s.view);
  const st = useStore.getState();
  return (
    <div className="bar" role="toolbar" aria-label="Live broadcast">
      <span className="live">LIVE</span>
      {FEEDS.map(([f, label]) => (
        <button key={f} aria-pressed={feed === f} onClick={() => st.setFeed(f)}>{label}</button>
      ))}
      <button aria-pressed={sound} onClick={() => st.setSound(!sound)}>{sound ? 'Sound on' : 'Sound off'}</button>
      <button aria-pressed={quality === 'high'} onClick={() => st.setQuality(quality === 'high' ? 'low' : 'high')} title="Broadcast and render quality">
        {quality === 'high' ? 'High quality' : 'Light mode'}
      </button>
      {view === 'map' && <span className="hint">The feed plays on the stage screen. Step into a seat to see it up close.</span>}
    </div>
  );
}

export function CheckoutDialog() {
  const checkout = useStore((s) => s.checkout);
  const hold = useStore((s) => s.hold);
  const order = useStore((s) => s.order);
  const eventId = useStore((s) => s.eventId);
  const ev = EVENT_BY_ID.get(eventId)!;
  const st = useStore.getState();
  if (checkout === 'review' && hold) {
    const total = hold.seats.reduce((a, i) => a + priceOf(VENUE.seats[i], ev), 0);
    return (
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="co-title">
        <div className="sheet">
          <h2 id="co-title">Review your seats</h2>
          <p className="meta">{ev.title} · {ev.date} · {VENUE_NAME}</p>
          <ul className="lines">
            {hold.seats.map((i) => (
              <li key={i}><span>{seatLabel(VENUE.seats[i])}</span><span>{formatPrice(priceOf(VENUE.seats[i], ev))}</span></li>
            ))}
            <li className="total"><span>Total</span><span>{formatPrice(total)}</span></li>
          </ul>
          <p className="demo-note">This is a demo checkout. No payment is taken and no real ticket is issued.</p>
          <div className="row">
            <button className="primary" autoFocus onClick={st.confirm}>Confirm demo booking</button>
            <button onClick={st.cancelCheckout}>Back</button>
          </div>
        </div>
      </div>
    );
  }
  if (checkout === 'done' && order) {
    const oev = EVENT_BY_ID.get(order.eventId)!;
    const bars = Array.from(order.number.replace(/\D/g, '') + '7319', (d, i) => <span key={i} style={{ width: 2 + (Number(d) % 4) * 2 }} />);
    return (
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="tk-title">
        <div className="ticket">
          <div className="watermark" aria-hidden="true">DEMO</div>
          <p className="tk-brand">SIGHTLINE XR · {VENUE_NAME}</p>
          <h2 id="tk-title">{oev.title}</h2>
          <p className="meta">{oev.date} · doors {oev.doors}</p>
          <ul className="lines">
            {order.seats.map((i) => (
              <li key={i}><span>{seatLabel(VENUE.seats[i])}</span><span>{sightOf(i).score}/100</span></li>
            ))}
          </ul>
          <div className="bars" aria-hidden="true">{bars}</div>
          <p className="tk-no">{order.number} · {formatPrice(order.total)}</p>
          <p className="demo-note">Demo ticket, not valid for entry. Fictional venue and event.</p>
          <button className="primary" autoFocus onClick={st.closeTicket}>Done</button>
        </div>
      </div>
    );
  }
  return null;
}

export function HoverTip() {
  const hover = useStore((s) => s.hover);
  const sold = useStore((s) => s.sold);
  const owned = useStore((s) => s.owned);
  const eventId = useStore((s) => s.eventId);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const on = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });
    addEventListener('pointermove', on);
    return () => removeEventListener('pointermove', on);
  }, []);
  if (hover == null) return null;
  const s = VENUE.seats[hover];
  const ev = EVENT_BY_ID.get(eventId)!;
  const taken = sold.has(hover) || owned.has(hover);
  return (
    <div className="tip" style={{ left: pos.x + 14, top: pos.y + 14 }} aria-hidden="true">
      <strong>{s.section} · Row {s.row} · Seat {s.number}</strong>
      <span>{taken ? 'Sold' : `${formatPrice(ev.prices[s.tier])} · sightline ${sightOf(hover).score}`}</span>
    </div>
  );
}
