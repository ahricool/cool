<script setup lang="ts">
import { readingShellKey } from '~/utils/reading-shell';
import { resolveCustomImage } from '~/utils/custom-image';
const props = withDefaults(
  defineProps<{
    variant?: 'home' | 'page';
    cover?: string | null;
    imageAlt?: string;
    wave?: boolean;
    fallback?: 'illustration' | 'cover';
    seed?: string;
  }>(),
  { variant: 'page', imageAlt: '', wave: true, fallback: 'illustration' },
);
const store = useSiteStore();
const image = computed(
  () =>
    resolveCustomImage(props.cover) ||
    (props.fallback === 'illustration'
      ? '/sakura/images/default/hd.webp'
      : null),
);
const hasImage = computed(() => !!image.value);
const element = ref<HTMLElement>();
const shell = inject(readingShellKey);
let unregister: (() => void) | undefined;
onMounted(() => {
  if (element.value)
    unregister = shell?.registerBanner(element.value, hasImage);
});
onBeforeUnmount(() => unregister?.());
</script>
<template>
  <section
    ref="element"
    class="reading-banner"
    :class="`reading-banner--${variant}`"
  >
    <div
      class="banner-artwork"
      :class="{ 'banner-artwork--pattern': !hasImage }"
    >
      <picture v-if="image"
        ><img
          class="banner-image"
          :src="image"
          :alt="imageAlt"
          width="1920"
          :height="variant === 'home' ? 1080 : 480"
          :fetchpriority="variant === 'home' ? 'high' : 'auto'"
      /></picture>
      <PatternSurface
        v-else
        :shape="store.site.appearance.cover"
        :seed="seed"
        data-pattern="cover"
      />
      <div class="banner-content"><slot /></div>
    </div>
    <ReadingWave v-if="wave" />
  </section>
</template>
