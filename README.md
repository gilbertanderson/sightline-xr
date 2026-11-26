# Sightline XR

**Step into any seat before you book it.** A WebXR seat-booking prototype built for PC VR, which also runs in Quest's browser and in any normal browser.

**Try it:** [gilbertanderson.com/sightline-xr](https://gilbertanderson.com/sightline-xr/)

![Sightline XR: a 3D concert hall with seats colored by price, and the booking panel](https://gilbertanderson.com/sightline-xr/screenshot.jpg)

Pick a seat in a 3D concert hall, step into it to see your exact view, and watch a live broadcast from the stage while you decide. Everything is fictional: the venue (Larkspur Hall), the three shows, and the checkout, which takes no payment and issues a ticket marked as a demo.

## What it does

- **2,612 seats in 12 sections** across orchestra, mezzanine and balcony, generated from a seeded script so every build is identical.
- **Step into a seat.** On desktop the camera glides to seated eye height; in VR the view fades and you're sitting there, at true scale.
- **Sightline score from 0 to 100,** built from distance to the performers, how far off center the seat is, neck tilt, and how much of the stage and screen is blocked by speaker stacks, the balcony rail or the balcony overhang. Each score comes with a one-line reason.
- **Live broadcast view.** Virtual cameras inside the hall render the show live: Wide, Close-up, Crowd and Your section. No video files, no stream rights, no cross-origin problems.
- **Best available** finds side-by-side seats for groups of 2 to 6.
- **Compare** up to 3 pinned seats by flipping between their views.
- **Holds with a 10-minute countdown,** then a demo checkout and ticket.
- **Stage audio** synthesized in the browser and placed on the stage with positional audio. It starts only when you turn sound on.

## Controls

| Mode | How |
| --- | --- |
| Desktop | Drag to orbit, scroll to zoom, click a seat. In a seat, drag to look around. |
| Phone | The same with touch; the booking panel becomes a bottom sheet. |
| PC VR | Point and pull the trigger. In the lounge, drag the model or use the right thumbstick to turn it; the panel on your left runs the booking. |

PC VR runs in Chrome or Edge on Windows through the active OpenXR runtime (SteamVR, Quest Link or Air Link, Virtual Desktop). Controller and hand models load from the WebXR input profiles CDN.

## Run it

```bash
npm install
npm run dev      # development server, with a headset emulator on localhost
npm test         # scoring, seat picking and venue tests
npm run build    # type-check and production build
```

Add `?test` to the URL to expose a small `window.__sightline` hook that scripts use to pick seats and step in; `scripts/screenshot.mjs` uses it to capture the screenshot above in CI.

## Stack

React, TypeScript and Vite; React Three Fiber and drei for the 3D scene; @react-three/xr for WebXR sessions, controllers, hands and moving the viewer into a seat; Zustand for state; Vitest and Playwright for tests and the screenshot. Fonts are self-hosted. Seats are one instanced mesh, and the broadcast is a single render target shared by every screen.

## Design brief

A calm box-office usher: clear and exact, never pushy. A dark plum hall lit from the stage, a warm amber accent, and Okabe-Ito price colors that stay distinct for color-blind visitors. Space Grotesk for display, Inter for text. 44 px touch targets, visible focus, and reduced motion respected throughout.

## License

MIT
