import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/sightline-xr/',
  plugins: [react()],
  // The headset emulator used in development ships its own Three.js; keep one copy for everything.
  resolve: { dedupe: ['three'] },
  build: { chunkSizeWarningLimit: 2000 },
});
