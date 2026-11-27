import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages can't send headers, so the policy ships as a meta tag. Added at build time only,
// because Vite's dev server (and the headset emulator) inject inline scripts.
// Everything is served from this site: controller and hand models come from /xr-profiles,
// glTF textures decode through blob: URLs, and the show audio is generated in the browser.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ');

function contentSecurityPolicy() {
  return {
    name: 'content-security-policy',
    apply: 'build' as const,
    transformIndexHtml(html: string) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig({
  base: '/sightline-xr/',
  plugins: [react(), contentSecurityPolicy()],
  // The headset emulator used in development ships its own Three.js; keep one copy for everything.
  resolve: { dedupe: ['three'] },
  build: { chunkSizeWarningLimit: 2000 },
});
