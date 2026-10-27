import type { Component } from 'vue';
import type { SiteAppearance } from '@cool/content';

export interface ThemeAppearanceDefinition {
  /** Cookie for a reader's own light/dark choice; omitted when the theme follows the device. */
  readonly readerCookie?: string;
  readonly resolve: (
    saved: SiteAppearance,
    preference: string | null,
  ) => {
    font: string;
    fontSize: number;
    /** `system` leaves light/dark to the theme's `prefers-color-scheme` styles. */
    palette: 'light' | 'dark' | 'system';
    attributes?: Readonly<Record<`data-${string}`, string>>;
  };
}
export const publicPages = [
  'home',
  'post',
  'page',
  'search',
  'about',
  'tags',
] as const;
export type ColorMode = 'light' | 'dark';
export type PublicPage = (typeof publicPages)[number];
export type ThemeLoader = () => Promise<{ default: Component }>;
export interface SiteTheme {
  readonly id: string;
  /** Build-time directory name used to constrain all owned styles. */
  readonly directory: string;
  readonly label: string;
  readonly description: string;
  readonly entry: ThemeLoader;
  readonly pages: Readonly<Record<PublicPage, ThemeLoader>>;
  readonly error: ThemeLoader;
  readonly appearance: ThemeAppearanceDefinition;
  readonly colorModes: readonly [ColorMode, ...ColorMode[]];
  readonly assets: { readonly icon: string; readonly touchIcon?: string };
}
