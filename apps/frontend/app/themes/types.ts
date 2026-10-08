import type { Component } from 'vue';
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
  readonly colorModes: readonly [ColorMode, ...ColorMode[]];
  readonly assets: { readonly icon: string; readonly touchIcon?: string };
}
