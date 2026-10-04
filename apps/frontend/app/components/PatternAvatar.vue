<script setup lang="ts">
import type { PatternShape } from '@cool/content';
withDefaults(
  defineProps<{
    shape?: PatternShape;
    seed?: string;
    alt?: string;
    width?: number;
    height?: number;
  }>(),
  { shape: 'heart', seed: 'owner-avatar', alt: '', width: 64, height: 64 },
);
</script>
<template>
  <PatternSurface
    class="pattern-avatar"
    :shape="shape"
    :seed="seed"
    :label="alt"
    :style="{ width: `${width}px`, height: `${height}px` }"
  />
</template>
<style scoped>
.pattern-avatar {
  display: inline-block;
  flex-shrink: 0;
  border-radius: 50%;
}
</style>
