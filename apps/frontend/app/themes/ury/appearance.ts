import { normalizeUryAppearance } from '@cool/content';
import type { ThemeAppearanceDefinition } from '../types';

export const uryAppearance: ThemeAppearanceDefinition = {
  readerCookie: 'cool_ury_palette',
  resolve: (saved, preference) => {
    const settings = normalizeUryAppearance(saved.ury);
    const palette =
      preference === 'light' || preference === 'sepia' || preference === 'dark'
        ? preference
        : settings.palette;
    return {
      font: settings.font,
      fontSize: settings.fontSize,
      palette,
      attributes: {
        'data-ury-palette': palette,
        'data-ury-width': settings.readingWidth,
      },
    };
  },
};
