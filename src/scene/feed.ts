import { WebGLRenderTarget, SRGBColorSpace, LinearFilter } from 'three';

/** One shared render target for the live broadcast. Every screen in the scene shows it. */
let target: WebGLRenderTarget | null = null;
let size = 0;

export function feedTarget(quality: 'high' | 'low') {
  const w = quality === 'high' ? 1280 : 640;
  if (!target || size !== w) {
    target?.dispose();
    target = new WebGLRenderTarget(w, Math.round((w * 9) / 16), { colorSpace: SRGBColorSpace, minFilter: LinearFilter, magFilter: LinearFilter, samples: quality === 'high' ? 4 : 0 });
    size = w;
  }
  return target;
}
