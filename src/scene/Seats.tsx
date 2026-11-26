import { useEffect, useMemo, useRef } from 'react';
import { InstancedMesh, MeshStandardMaterial, Object3D, Color } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { VENUE } from '../data/venue';
import { useStore } from '../store';
import { SEAT_COLORS } from './palette';
import { seatGeometry } from './hallGeometry';

const tmp = new Object3D();
const col = new Color();

export function Seats({ interactive = true, dragGuard }: { interactive?: boolean; dragGuard?: { current: boolean } }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => seatGeometry(), []);
  const material = useMemo(() => new MeshStandardMaterial({ roughness: 0.65, metalness: 0, emissive: '#ffffff', emissiveIntensity: 0.0 }), []);
  const sold = useStore((s) => s.sold);
  const owned = useStore((s) => s.owned);
  const picked = useStore((s) => s.picked);
  const hover = useStore((s) => s.hover);
  const hold = useStore((s) => s.hold);
  const compare = useStore((s) => s.compare);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    VENUE.seats.forEach((s, i) => {
      tmp.position.set(s.x, s.y, s.z);
      tmp.rotation.set(0, s.yaw, 0);
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const pickedSet = new Set(picked);
    const heldSet = new Set(hold?.seats ?? []);
    const pinned = new Set(compare);
    VENUE.seats.forEach((s, i) => {
      let hex = SEAT_COLORS[s.tier];
      if (owned.has(i)) hex = SEAT_COLORS.owned;
      else if (sold.has(i)) hex = SEAT_COLORS.sold;
      if (heldSet.has(i)) hex = SEAT_COLORS.held;
      else if (pickedSet.has(i)) hex = SEAT_COLORS.picked;
      col.set(hex);
      if (pinned.has(i) && !pickedSet.has(i)) col.lerp(new Color('#ffffff'), 0.45);
      if (hover === i && !sold.has(i)) col.lerp(new Color('#ffffff'), 0.6);
      mesh.setColorAt(i, col);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [sold, owned, picked, hover, hold, compare]);

  const handlers = interactive
    ? {
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          if (e.instanceId != null && useStore.getState().hover !== e.instanceId) useStore.getState().setHover(e.instanceId);
        },
        onPointerOut: () => useStore.getState().setHover(null),
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (dragGuard?.current) return;
          if (e.instanceId != null) useStore.getState().pick(e.instanceId);
        },
      }
    : {};

  return <instancedMesh ref={ref} args={[geometry, material, VENUE.seats.length]} {...handlers} />;
}
