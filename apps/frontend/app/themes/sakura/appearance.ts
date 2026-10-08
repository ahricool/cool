import { normalizeFontSize } from '@cool/content';
import type { ThemeAppearanceDefinition } from '../types';

export const sakuraAppearance: ThemeAppearanceDefinition = {
  readerCookie: 'cool_theme',
  resolve: (saved, preference) => ({
    font: saved.font === 'bubble-candy' ? 'bubble-candy' : 'default',
    fontSize: normalizeFontSize(saved.fontSize),
    palette: preference === 'dark' ? 'dark' : 'light',
  }),
};
