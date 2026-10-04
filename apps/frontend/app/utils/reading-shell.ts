import type { InjectionKey, Ref } from 'vue';

export const readingShellKey: InjectionKey<{
  menuOpen: Ref<boolean>;
  openMenu: (event: Event) => void;
  registerBanner: (element: HTMLElement) => () => void;
}> = Symbol('reading-shell');
