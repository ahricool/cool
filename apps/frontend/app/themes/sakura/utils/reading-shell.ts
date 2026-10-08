import type { InjectionKey, Ref } from 'vue';

export const readingShellKey: InjectionKey<{
  registerBanner: (
    element: HTMLElement,
    hasImage: Readonly<Ref<boolean>>,
  ) => () => void;
}> = Symbol('reading-shell');
