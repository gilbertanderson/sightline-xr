import { useState, type ReactNode } from 'react';
import { Text } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import { FONT } from './fonts';

/** Flat 3D buttons and labels for VR panels. Big targets, high contrast, self-hosted fonts. */
export function Btn({ label, onClick, w = 0.17, h = 0.05, active, disabled, ...group }: { label: string; onClick: () => void; w?: number; h?: number; active?: boolean; disabled?: boolean } & ThreeElements['group']) {
  const [hover, setHover] = useState(false);
  const bg = disabled ? '#221e2b' : active ? '#E69F00' : hover ? '#433a5c' : '#2b2539';
  return (
    <group {...group}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={bg} toneMapped={false} />
      </mesh>
      <Text font={FONT.strong} fontSize={Math.min(h * 0.4, 0.019)} maxWidth={w - 0.012} textAlign="center" color={active ? '#15111c' : disabled ? '#6d6680' : '#f4f1fa'} position={[0, 0, 0.002]} anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

export function Label({ children, size = 0.017, color = '#f4f1fa', font = FONT.body, maxWidth, ...group }: { children: ReactNode; size?: number; color?: string; font?: string; maxWidth?: number } & ThreeElements['group']) {
  return (
    <group {...group}>
      <Text font={font} fontSize={size} color={color} anchorX="left" anchorY="top" maxWidth={maxWidth} lineHeight={1.3}>
        {children}
      </Text>
    </group>
  );
}

export function PanelBg({ w, h }: { w: number; h: number }) {
  return (
    <mesh position={[0, 0, -0.004]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial color="#120f19" transparent opacity={0.94} toneMapped={false} />
    </mesh>
  );
}
