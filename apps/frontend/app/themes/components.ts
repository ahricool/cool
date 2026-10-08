import { defineAsyncComponent } from 'vue';
import type { ThemeLoader } from './types';
// Stable component identities prevent remounting on unrelated reactive updates.
const components = new Map<
  ThemeLoader,
  ReturnType<typeof defineAsyncComponent>
>();
export function themeComponent(loader: ThemeLoader) {
  let component = components.get(loader);
  if (!component) {
    component = defineAsyncComponent(loader);
    components.set(loader, component);
  }
  return component;
}
