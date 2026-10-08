import type { ThemeAppearanceDefinition } from '../types';

/** Minimal has its own fixed defaults; legacy Sakura settings remain saved. */
export const minimalAppearance: ThemeAppearanceDefinition = {
  readerCookie: 'cool_theme',
  resolve: (_saved, preference) => ({
    font: 'system',
    fontSize: 100,
    palette: preference === 'dark' ? 'dark' : 'light',
  }),
};
