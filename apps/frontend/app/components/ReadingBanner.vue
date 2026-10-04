<script setup lang="ts">
import { readingShellKey } from '~/utils/reading-shell';
withDefaults(
  defineProps<{
    variant?: 'home' | 'page';
    cover?: string | null;
    imageAlt?: string;
    wave?: boolean;
  }>(),
  { variant: 'page', imageAlt: '', wave: true },
);
const element = ref<HTMLElement>();
const shell = inject(readingShellKey);
let unregister: (() => void) | undefined;
onMounted(() => {
  if (element.value) unregister = shell?.registerBanner(element.value);
});
onBeforeUnmount(() => unregister?.());
</script>
<template>
  <section
    ref="element"
    class="reading-banner"
    :class="`reading-banner--${variant}`"
  >
    <div class="banner-artwork">
      <picture
        ><img
          class="banner-image"
          :src="cover || '/sakura/images/default/hd.webp'"
          :alt="imageAlt"
          width="1920"
          :height="variant === 'home' ? 1080 : 480"
          :fetchpriority="variant === 'home' ? 'high' : 'auto'"
      /></picture>
      <div class="banner-content"><slot /></div>
    </div>
    <ReadingWave v-if="wave" />
  </section>
</template>
