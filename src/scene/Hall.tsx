import { useMemo, useRef } from 'react';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { BackSide, DoubleSide, Mesh, MeshStandardMaterial, PerspectiveCamera, Vector3 } from 'three';
import { BALCONY, SPEAKERS, STAGE, VENUE, EYE_HEIGHT } from '../data/venue';
import { RAIL_HEIGHT } from '../data/sightline';
import { useStore } from '../store';
import { HALL } from './palette';
import { balconySlab, bandGeometry, tieredFloor } from './hallGeometry';
import { Seats } from './Seats';
import { StageShow } from './StageShow';
import { feedTarget } from './feed';

/** Screens hide while the broadcast renders, so a screen never films itself. */
export const screens = new Set<Mesh>();

export function Screen(props: ThreeElements['group'] & { w: number; h: number }) {
  const quality = useStore((s) => s.quality);
  const tex = feedTarget(quality).texture;
  const { w, h, ...rest } = props;
  return (
    <group {...rest}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[w + 0.12, h + 0.12, 0.04]} />
        <meshStandardMaterial color="#0c0b10" roughness={0.4} />
      </mesh>
      <mesh ref={(m) => { if (m) screens.add(m); }}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

type V = [number, number, number];
const FEEDS: Record<'wide' | 'close' | 'crowd', { pos: V; look: V; fov: number }> = {
  wide: { pos: [0, 13, 21], look: [0, 3, -4], fov: 40 },
  close: { pos: [3.4, 3.3, 2.4], look: [0.3, 2.7, -3.8], fov: 32 },
  crowd: { pos: [0, 4.2, -7], look: [0, 4, 20], fov: 62 },
};

/** Virtual cameras inside the hall. Rendering happens here, in the hall's own coordinates, so the mini model can broadcast too. */
function FeedCameras() {
  const cams = useMemo(() => {
    const make = (fov: number) => new PerspectiveCamera(fov, 16 / 9, 0.1, 200);
    return { wide: make(FEEDS.wide.fov), close: make(FEEDS.close.fov), crowd: make(FEEDS.crowd.fov), section: make(52) };
  }, []);
  const frame = useRef(0);
  const look = useMemo(() => new Vector3(), []);
  useMemo(() => {
    (['wide', 'close', 'crowd'] as const).forEach((k) => {
      cams[k].position.set(...FEEDS[k].pos);
      cams[k].lookAt(look.set(...FEEDS[k].look));
    });
  }, [cams, look]);

  useFrame((state) => {
    const { feed, quality, viewSeat, picked } = useStore.getState();
    frame.current++;
    if (quality === 'low' && frame.current % 2) return;
    const cam = cams[feed];
    if (feed === 'section') {
      const s = VENUE.seats[viewSeat ?? picked[0] ?? VENUE.seats.findIndex((x) => x.section === '202' && x.row === 6)];
      cam.position.set(s.x, s.y + EYE_HEIGHT, s.z);
      cam.lookAt(look.set(STAGE.focus.x, STAGE.focus.y + 0.6, STAGE.focus.z));
    }
    cam.updateMatrixWorld();
    const gl = state.gl;
    const target = feedTarget(quality);
    const prev = gl.getRenderTarget();
    const xrOn = gl.xr.enabled;
    screens.forEach((m) => (m.visible = false));
    gl.xr.enabled = false;
    gl.setRenderTarget(target);
    gl.render(state.scene, cam);
    gl.setRenderTarget(prev);
    gl.xr.enabled = xrOn;
    screens.forEach((m) => (m.visible = true));
  });

  return (
    <group>
      <primitive object={cams.wide} />
      <primitive object={cams.close} />
      <primitive object={cams.crowd} />
      <primitive object={cams.section} />
    </group>
  );
}

export function Hall({ feedSource = false, interactive = true, dragGuard, mini = false }: { feedSource?: boolean; interactive?: boolean; dragGuard?: { current: boolean }; mini?: boolean }) {
  const geo = useMemo(
    () => ({
      orchestra: tieredFloor(20, 5.5, 0.9, 0, 0.12),
      mezz: tieredFloor(14, 23.5, 0.9, 2.2, 0.15),
      balcony: tieredFloor(10, 20, 0.85, BALCONY.top, 0.4),
      slab: balconySlab(),
      rail: bandGeometry(BALCONY.rInner - 0.05, BALCONY.top, RAIL_HEIGHT),
      backWall: bandGeometry(37, 0, 16, (56 * Math.PI) / 180),
    }),
    [],
  );
  const floorMat = useMemo(() => new MeshStandardMaterial({ color: HALL.floor, roughness: 0.95, side: DoubleSide }), []);
  const riserMat = useMemo(() => new MeshStandardMaterial({ color: HALL.riser, roughness: 0.9, side: DoubleSide }), []);
  const wallMat = useMemo(() => new MeshStandardMaterial({ color: HALL.wall, roughness: 1, side: DoubleSide }), []);
  const backWallMat = useMemo(() => new MeshStandardMaterial({ color: HALL.wall, roughness: 1, side: BackSide }), []);
  const sideAngle = (55 * Math.PI) / 180;

  return (
    <group>
      {/* audience floors */}
      <mesh geometry={geo.orchestra} material={floorMat} />
      <mesh geometry={geo.mezz} material={floorMat} />
      <mesh geometry={geo.balcony} material={riserMat} />
      <mesh geometry={geo.slab} material={riserMat} />
      <mesh geometry={geo.rail}>
        <meshStandardMaterial color={HALL.rail} metalness={0.6} roughness={0.35} transparent opacity={0.55} side={DoubleSide} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 12]} material={floorMat}>
        <circleGeometry args={[38, 64]} />
      </mesh>
      {/* walls */}
      <mesh geometry={geo.backWall} material={backWallMat} />
      {[-1, 1].map((side) => (
        <mesh key={side} material={wallMat} position={[Math.sin(side * sideAngle) * 24.5, 8, Math.cos(side * sideAngle) * 24.5]} rotation-y={side * sideAngle + Math.PI / 2}>
          <planeGeometry args={[25, 16]} />
        </mesh>
      ))}
      {/* stage house */}
      <mesh position={[0, STAGE.height / 2, -STAGE.depth / 2]}>
        <boxGeometry args={[STAGE.width, STAGE.height, STAGE.depth]} />
        <meshStandardMaterial color={HALL.stage} roughness={0.5} />
      </mesh>
      <mesh position={[0, STAGE.height + 0.005, -0.06]}>
        <boxGeometry args={[STAGE.width, 0.02, 0.1]} />
        <meshBasicMaterial color="#ffd38a" />
      </mesh>
      <mesh position={[0, 7.5, -9.8]} material={wallMat}>
        <planeGeometry args={[26, 15]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 10.6, 7.5, -4.6]} rotation-y={-side * Math.PI / 2} material={wallMat}>
          <planeGeometry args={[10.6, 15]} />
        </mesh>
      ))}
      <mesh position={[0, 14.2, -0.2]}>
        <boxGeometry args={[21.5, 1.6, 0.5]} />
        <meshStandardMaterial color="#1a1622" />
      </mesh>
      {SPEAKERS.map((sp) => (
        <mesh key={sp.x} position={[sp.x, (sp.yMin + sp.yMax) / 2, sp.z]}>
          <boxGeometry args={[sp.w, sp.yMax - sp.yMin, sp.d]} />
          <meshStandardMaterial color={HALL.speaker} roughness={0.8} />
        </mesh>
      ))}
      <Screen w={STAGE.screen.w} h={STAGE.screen.h} position={[STAGE.screen.x, STAGE.screen.y, STAGE.screen.z]} />
      <StageShow />
      <Seats interactive={interactive} dragGuard={dragGuard} />
      {/* lighting: one warm key over the stage, a soft fill for the house */}
      {!mini && <hemisphereLight args={['#a89ccf', '#1a1524', 2.4]} />}
      {!mini && <ambientLight intensity={0.5} color="#b8b0d8" />}
      {!mini && <spotLight position={[0, 13, 6]} angle={0.55} penumbra={0.6} intensity={1400} distance={45} decay={1.6} color="#ffe2b8" target-position={[0, STAGE.height, -4]} />}
      {!mini && <pointLight position={[0, 11, 20]} intensity={500} distance={60} decay={1.6} color="#9d92cc" />}
      {feedSource && <FeedCameras />}
    </group>
  );
}
