import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { World } from './scene/World';
import { Panel, BroadcastBar, CheckoutDialog, HoverTip } from './ui/Panel';
import { useStore } from './store';
import { VENUE } from './data/venue';

const xrStore = createXRStore({ frameRate: 'high', offerSession: false, emulate: import.meta.env.DEV ? { type: 'metaQuest3', syntheticEnvironment: false } : false });

type Support = 'checking' | 'vr' | 'none' | 'no-webxr';

function useVRSupport(): Support {
  const [s, setS] = useState<Support>('checking');
  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr) return setS('no-webxr');
    xr.isSessionSupported('immersive-vr').then((ok) => setS(ok ? 'vr' : 'none')).catch(() => setS('none'));
  }, []);
  return s;
}

const NOTES: Record<Support, string> = {
  checking: 'Checking for a headset…',
  vr: 'Headset ready. In VR, point and pull the trigger to pick seats.',
  none: 'No headset found. For PC VR, open this page in Chrome or Edge with SteamVR, Quest Link or Virtual Desktop running.',
  'no-webxr': 'This browser has no WebXR, so this is the desktop view. For PC VR, use Chrome or Edge.',
};

export default function App() {
  const support = useVRSupport();
  const quality = useStore((s) => s.quality);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!/[?&]test\b/.test(location.search)) return;
    const st = () => useStore.getState();
    (window as unknown as { __sightline: unknown }).__sightline = {
      seats: VENUE.seats.length,
      state: st,
      pick: (id: string) => st().pick(VENUE.seats.findIndex((s) => s.id === id)),
      best: (n: number) => {
        st().setGroupSize(n);
        st().pickBest();
      },
      stepIn: () => st().stepIn(),
      back: () => st().backToMap(),
      setFeed: st().setFeed,
      enterVR: () => xrStore.enterVR(),
    };
  }, []);

  return (
    <>
      <div id="stage">
        <Canvas dpr={quality === 'high' ? [1, 2] : 1} camera={{ fov: 50, near: 0.05, far: 400, position: [0, 24, 46] }} gl={{ antialias: true }}>
          <XR store={xrStore}>
            <World />
          </XR>
        </Canvas>
      </div>
      <header>
        <h1>Sightline <b>XR</b></h1>
        <p>Step into any seat before you book it. A WebXR prototype for PC VR and the browser.</p>
      </header>
      <div id="xr">
        <button className="primary" disabled={support !== 'vr'} onClick={() => xrStore.enterVR().catch((e: Error) => setError(e.message))}>Enter VR</button>
        <span className="xrnote">{error ? `Could not start VR: ${error}` : NOTES[support]}</span>
      </div>
      <Panel />
      <BroadcastBar />
      <CheckoutDialog />
      <HoverTip />
      <footer>Fictional venue and events. No real tickets or payments. <a href="https://github.com/gilbertanderson/sightline-xr">Source on GitHub</a></footer>
    </>
  );
}
