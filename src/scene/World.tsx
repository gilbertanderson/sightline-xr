import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import { XROrigin, useXR, useXRInputSourceState } from '@react-three/xr';
import { AudioListener, BackSide, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { EYE_HEIGHT, STAGE, VENUE } from '../data/venue';
import { useStore } from '../store';
import { Hall, Screen } from './Hall';
import { LoungePanel, SeatPanel } from './VRPanels';
import { createShowAudio } from './audio';
import { HALL } from './palette';

const up = new Vector3(0, 1, 0);

/** Where the floating broadcast screen sits for a seat: ahead and to the right, facing the seat. */
function seatScreenPose(index: number, side: 1 | -1) {
  const s = VENUE.seats[index];
  const eye = new Vector3(s.x, s.y + EYE_HEIGHT, s.z);
  const dir = new Vector3(STAGE.focus.x - s.x, 0, STAGE.focus.z - s.z).normalize();
  const right = new Vector3().crossVectors(dir, up).normalize();
  const pos = eye.clone().addScaledVector(dir, 3).addScaledVector(right, 1.9 * side).addScaledVector(up, 0.35);
  const yaw = Math.atan2(eye.x - pos.x, eye.z - pos.z);
  return { pos, yaw };
}

/** In VR the panel is on the left, so the screen goes right; on desktop the booking panel covers the right, so it goes left. */
function SeatScreen({ side = 1 }: { side?: 1 | -1 }) {
  const viewSeat = useStore((s) => s.viewSeat);
  const pose = useMemo(() => (viewSeat == null ? null : seatScreenPose(viewSeat, side)), [viewSeat, side]);
  if (!pose) return null;
  return <Screen w={1.6} h={0.9} position={pose.pos} rotation-y={pose.yaw} />;
}

function FlatCamera() {
  const ref = useRef<CameraControls>(null);
  const view = useStore((s) => s.view);
  const viewSeat = useStore((s) => s.viewSeat);
  const reduced = useStore((s) => s.reducedMotion);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (view === 'seat' && viewSeat != null) {
      const s = VENUE.seats[viewSeat];
      const eye = new Vector3(s.x, s.y + EYE_HEIGHT, s.z);
      const dir = new Vector3(STAGE.focus.x, STAGE.focus.y + 0.8, STAGE.focus.z).sub(eye).normalize();
      const t = eye.clone().addScaledVector(dir, 0.05);
      c.minDistance = 0.01;
      c.maxDistance = 0.06;
      c.azimuthRotateSpeed = -0.35;
      c.polarRotateSpeed = -0.35;
      c.minPolarAngle = 0.4;
      c.maxPolarAngle = 2.4;
      c.truckSpeed = 0;
      c.dollySpeed = 0;
      c.setLookAt(eye.x, eye.y, eye.z, t.x, t.y, t.z, !reduced);
    } else {
      c.minDistance = 6;
      c.maxDistance = 75;
      c.azimuthRotateSpeed = 1;
      c.polarRotateSpeed = 1;
      c.minPolarAngle = 0.15;
      c.maxPolarAngle = 1.42;
      c.truckSpeed = 1;
      c.dollySpeed = 1;
      c.setLookAt(0, 21, 33, 0, 2.5, 6, !reduced);
    }
    // keep the hall centered in the space left of the booking panel
    c.setFocalOffset(innerWidth > 760 ? (view === 'seat' ? 0 : 5.5) : 0, innerWidth > 760 ? 0 : -4, 0, !reduced);
  }, [view, viewSeat, reduced]);
  return <CameraControls ref={ref} makeDefault smoothTime={0.6} />;
}

function ShowAudio() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const inXR = useXR((s) => s.mode != null);
  const sound = useStore((s) => s.sound);
  const listener = useMemo(() => new AudioListener(), []);
  const show = useMemo(() => createShowAudio(listener), [listener]);
  useEffect(() => {
    const host = inXR ? gl.xr.getCamera() : camera;
    host.add(listener);
    return () => void host.remove(listener);
  }, [inXR, camera, gl, listener]);
  useEffect(() => {
    if (sound) show.start();
    else show.stop();
  }, [sound, show]);
  return <primitive object={show.positional} position={[0, 4, -3]} />;
}

/** Lounge: a dim room with the venue as a model on a table. Drag or thumbstick turns the model; the player never moves. */
function Lounge() {
  const spin = useStore((s) => s.spin);
  const turn = useRef<Group>(null);
  const drag = useRef<{ yaw: number; spin: number } | null>(null);
  const moved = useRef(false);
  const right = useXRInputSourceState('controller', 'right');
  useFrame((_, dt) => {
    const stick = (right?.gamepad as Record<string, { xAxis?: number }> | undefined)?.['xr-standard-thumbstick'];
    const x = stick?.xAxis ?? 0;
    if (Math.abs(x) > 0.2) useStore.getState().addSpin(-x * dt * 1.6);
    if (turn.current) turn.current.rotation.y += (useStore.getState().spin - turn.current.rotation.y) * Math.min(1, dt * 10);
  });
  const yawOf = (d: Vector3) => Math.atan2(d.x, -d.z);
  return (
    <group>
      <color attach="background" args={['#0b0910']} />
      <hemisphereLight args={['#9d93c4', '#0d0b12', 1.1]} />
      <pointLight position={[0, 2.4, -0.6]} intensity={6} distance={6} color="#ffe2b8" />
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[6, 48]} />
        <meshStandardMaterial color="#17131f" roughness={1} />
      </mesh>
      <mesh position={[0, 0.4, -0.85]}>
        <cylinderGeometry args={[0.78, 0.7, 0.8, 48]} />
        <meshStandardMaterial color="#231d30" roughness={0.6} />
      </mesh>
      <group position={[0, 0.81, -0.85]}>
        <group
          ref={turn}
          onPointerDown={(e) => {
            moved.current = false;
            drag.current = { yaw: yawOf(e.ray.direction), spin: useStore.getState().spin };
            (e.target as unknown as { setPointerCapture?: (id: number) => void }).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const d = yawOf(e.ray.direction) - drag.current.yaw;
            if (Math.abs(d) > 0.02) moved.current = true;
            if (moved.current) useStore.setState({ spin: drag.current.spin + d * 4 });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          <group scale={1 / 55}>
            <group position={[0, 0, -14]}>
              <Hall feedSource dragGuard={moved} mini />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function Fader({ fade }: { fade: { current: number } }) {
  const gl = useThree((s) => s.gl);
  const mesh = useRef<Mesh>(null);
  const mat = useMemo(() => new MeshBasicMaterial({ color: '#000000', transparent: true, depthTest: false, side: BackSide }), []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    m.position.copy(gl.xr.getCamera().position);
    mat.opacity = fade.current;
    m.visible = fade.current > 0.01;
  });
  return (
    <mesh ref={mesh} material={mat} renderOrder={999}>
      <sphereGeometry args={[0.25, 16, 12]} />
    </mesh>
  );
}

function VRWorld() {
  const gl = useThree((s) => s.gl);
  const view = useStore((s) => s.view);
  const viewSeat = useStore((s) => s.viewSeat);
  const want = `${view}:${view === 'seat' ? viewSeat : ''}`;
  const [shown, setShown] = useState({ key: want, view, viewSeat, head: 1.6 });
  const fade = useRef(0);
  useFrame((_, dt) => {
    if (shown.key !== want) {
      fade.current = Math.min(1, fade.current + dt * 5);
      if (fade.current >= 1) {
        const head = gl.xr.getCamera().position.y || 1.6;
        setShown({ key: want, view, viewSeat, head });
      }
    } else fade.current = Math.max(0, fade.current - dt * 4);
  });

  const seat = shown.view === 'seat' && shown.viewSeat != null ? VENUE.seats[shown.viewSeat] : null;
  const head = shown.head;
  return (
    <>
      {seat ? (
        <>
          <color attach="background" args={[HALL.bg]} />
          <Hall feedSource />
          <SeatScreen />
          <XROrigin position={[seat.x, seat.y + EYE_HEIGHT - head, seat.z]} rotation-y={seat.yaw}>
            <group position={[-0.42, head - 0.42, -0.5]} rotation-y={0.62} rotation-x={-0.25}>
              <SeatPanel />
            </group>
            <Fader fade={fade} />
          </XROrigin>
        </>
      ) : (
        <>
          <Lounge />
          <XROrigin position={[0, 0, 0]}>
            <group position={[-0.62, Math.max(0.95, head - 0.4), -0.48]} rotation-y={0.78} rotation-x={-0.2}>
              <LoungePanel />
            </group>
            <group position={[0.95, Math.max(1.3, head + 0.1), -1.7]} rotation-y={-0.45}>
              <Screen w={1.28} h={0.72} />
            </group>
            <Fader fade={fade} />
          </XROrigin>
        </>
      )}
    </>
  );
}

function FlatWorld() {
  return (
    <>
      <color attach="background" args={[HALL.bg]} />
      <fog attach="fog" args={[HALL.bg, 60, 140]} />
      <Hall feedSource />
      <SeatScreen side={innerWidth > 760 ? -1 : 1} />
      <FlatCamera />
    </>
  );
}

function TestProbe() {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (/[?&]test\b/.test(location.search)) Object.assign(window, { __cam: camera, __scene: scene });
  }, [camera, scene]);
  return null;
}

export function World() {
  const inXR = useXR((s) => s.mode != null);
  return (
    <>
      {inXR ? <VRWorld /> : <FlatWorld />}
      <TestProbe />
      <ShowAudio />
    </>
  );
}
