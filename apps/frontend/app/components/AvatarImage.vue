<script setup lang="ts">
import { resolveCustomImage } from '~/utils/custom-image';
withDefaults(
  defineProps<{
    src?: string | null;
    alt: string;
    width?: number;
    height?: number;
  }>(),
  { width: 64, height: 64 },
);
const store = useSiteStore();
</script>
<template>
  <img
    v-if="resolveCustomImage(src)"
    :src="resolveCustomImage(src)!"
    :alt="alt"
    :width="width"
    :height="height"
  />
  <PatternAvatar
    v-else
    :shape="store.site.appearance.avatar"
    :alt="alt"
    :width="width"
    :height="height"
  />
</template>
