import { Color } from 'three';

/** Okabe-Ito colors, chosen so price tiers stay distinct for color-blind visitors. */
export const SEAT_COLORS = {
  premium: '#E69F00',
  standard: '#56B4E9',
  value: '#009E73',
  sold: '#2e2a38',
  picked: '#ffffff',
  held: '#F0E442',
  owned: '#CC79A7',
};

export const HALL = {
  floor: '#2a2438',
  riser: '#352d47',
  wall: '#1c1828',
  balcony: '#352d47',
  rail: '#8d86a6',
  stage: '#2b2535',
  speaker: '#0b0a10',
  bg: '#07060b',
};

export const c = (hex: string) => new Color(hex);
