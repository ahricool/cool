import { resolve } from 'node:path';

// Both src/ and dist/ live three levels below the repository/container root.
// npm workspace commands change cwd to apps/backend; uploads must not move.
const projectRoot = resolve(__dirname, '../../..');

export const mediaRoot = () =>
  resolve(projectRoot, process.env.MEDIA_ROOT || 'data');
