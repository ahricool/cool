// Compile the backend's copy from the same finite parser used by the frontend.
import { copyFile, mkdir } from 'node:fs/promises';
const source = new URL(
  '../packages/content/src/media-groups.ts',
  import.meta.url,
);
const output = new URL(
  '../apps/backend/src/generated/content/',
  import.meta.url,
);
await mkdir(output, { recursive: true });
await copyFile(source, new URL('media-groups.ts', output));
