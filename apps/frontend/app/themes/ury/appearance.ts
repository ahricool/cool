import { normalizeUryAppearance } from '@cool/content';
import type { ThemeAppearanceDefinition } from '../types';

/** Always serif; light or dark comes from the device, with no reader choice. */
export const uryAppearance: ThemeAppearanceDefinition = {
  resolve: (saved) => {
    const settings = normalizeUryAppearance(saved.ury);
    return {
      font: 'serif',
      fontSize: settings.fontSize,
      palette: 'system',
      attributes: { 'data-ury-width': settings.readingWidth },
    };
  },
};
