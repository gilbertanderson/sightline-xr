import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { STAGE } from '../data/venue';
import { useStore } from '../store';
import { EVENT_BY_ID } from '../data/events';

const PERFORMERS = [-4.2, -1.4, 1.4, 4.2];
const BEAMS = [-6, -3.6, -1.2, 1.2, 3.6, 6];
const BARS = Array.from({ length: 10 }, (_, i) => -6.75 + i * 1.5);

/** Performers, moving light beams and LED bars, timed to a shared beat. */
export function StageShow() {
  const eventId = useStore((s) => s.eventId);
  const motion = !useStore((s) => s.reducedMotion);
  const hue = EVENT_BY_ID.get(eventId)!.hue;
  const performers = useRef<Group[]>([]);
  const beams = useRef<Mesh[]>([]);
  const barMat = useMemo(() => new MeshStandardMaterial({ color: '#000000', emissive: new Color(), emissiveIntensity: 1.1 }), []);
  const beamMat = useMemo(() => new MeshBasicMaterial({ transparent: true, opacity: 0.13, blending: AdditiveBlending, depthWrite: false }), []);
  const bodyMat = useMemo(() => new MeshStandardMaterial({ color: '#16131d', roughness: 0.6, emissive: new Color(), emissiveIntensity: 0.35 }), []);
  const a = useMemo(() => new Color().setHSL(hue, 0.9, 0.5), [hue]);
  const b = useMemo(() => new Color().setHSL((hue + 0.33) % 1, 0.9, 0.5), [hue]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const beat = motion ? Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * (112 / 60) / 2)), 6) : 0.4;
    barMat.emissive.copy(a).lerp(b, 0.5 + 0.5 * Math.sin(t * 0.7)).multiplyScalar(0.35 + 0.65 * beat);
    bodyMat.emissive.copy(a).multiplyScalar(0.25 + 0.4 * beat);
    beamMat.color.copy(b).lerp(a, 0.5 + 0.5 * Math.sin(t * 0.4));
    performers.current.forEach((g, i) => {
      if (!g) return;
      g.position.y = STAGE.height + (motion ? Math.abs(Math.sin(t * 3.7 + i)) * 0.12 : 0);
      g.rotation.y = motion ? Math.sin(t * 0.8 + i * 1.7) * 0.5 : 0;
    });
    beams.current.forEach((m, i) => {
      if (!m) return;
      m.rotation.z = motion ? Math.sin(t * 0.9 + i * 0.8) * 0.45 : (i - 2.5) * 0.08;
      m.rotation.x = motion ? 0.35 + Math.sin(t * 0.6 + i) * 0.2 : 0.35;
    });
  });

  return (
    <group>
      {PERFORMERS.map((x, i) => (
        <group key={x} position={[x, STAGE.height, STAGE.focus.z + (i % 2 ? 0.6 : -0.4)]} ref={(g) => { if (g) performers.current[i] = g; }}>
          <mesh position={[0, 0.85, 0]} material={bodyMat}>
            <capsuleGeometry args={[0.26, 0.95, 4, 10]} />
          </mesh>
          <mesh position={[0, 1.72, 0]} material={bodyMat}>
            <sphereGeometry args={[0.2, 16, 12]} />
          </mesh>
        </group>
      ))}
      {BARS.map((x) => (
        <mesh key={x} position={[x, STAGE.height + 2.2, -8.1]} material={barMat}>
          <boxGeometry args={[0.18, 4.2, 0.12]} />
        </mesh>
      ))}
      {BEAMS.map((x, i) => (
        <group key={x} position={[x, 11, -5]}>
          <mesh ref={(m) => { if (m) beams.current[i] = m; }} material={beamMat}>
            <coneGeometry args={[1.6, 10, 24, 1, true]} onUpdate={(g) => g.translate(0, -5, 0)} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
