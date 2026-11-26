// Copies the WebXR input profiles (controller and hand models) this app supports into
// public/xr-profiles, so the headset loads them from this site instead of a CDN.
// Runs before dev and build; the copied files are not committed.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const src = 'node_modules/@webxr-input-profiles/assets/dist/profiles';
const out = 'public/xr-profiles';

// PC VR headsets first, then Quest and Pico for their browsers, then generic fallbacks and hands.
const PROFILES = [
  'valve-index',
  'htc-vive',
  'htc-vive-cosmos',
  'hp-mixed-reality',
  'microsoft-mixed-reality',
  'samsung-odyssey',
  'oculus-touch',
  'oculus-touch-v2',
  'oculus-touch-v3',
  'meta-quest-touch-plus',
  'meta-quest-touch-plus-v2',
  'meta-quest-touch-pro',
  'pico-4',
  'pico-4u',
  'generic-trigger',
  'generic-trigger-squeeze-thumbstick',
  'generic-hand',
];

if (!existsSync(src)) {
  console.error(`Missing ${src}. Run npm install first.`);
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const list = JSON.parse(readFileSync(join(src, 'profilesList.json'), 'utf8'));
const kept = {};
for (const id of PROFILES) {
  if (!list[id]) throw new Error(`Unknown profile ${id}`);
  for (const file of ['profile.json', 'left.glb', 'right.glb']) {
    const from = join(src, id, file);
    if (existsSync(from)) {
      mkdirSync(join(out, id), { recursive: true });
      cpSync(from, join(out, id, file));
    }
  }
  kept[id] = list[id];
}
writeFileSync(join(out, 'profilesList.json'), JSON.stringify(kept, null, 2));
console.log(`Copied ${PROFILES.length} input profiles to ${out}`);
