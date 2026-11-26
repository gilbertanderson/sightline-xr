import inter400 from '@fontsource/inter/files/inter-latin-400-normal.woff?url';
import inter600 from '@fontsource/inter/files/inter-latin-600-normal.woff?url';
import grotesk700 from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url';

/** Self-hosted fonts for 3D text, bundled by Vite so nothing loads from a CDN. */
export const FONT = { body: inter400, strong: inter600, display: grotesk700 };
