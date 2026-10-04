<script setup lang="ts">
import type { PatternShape } from '@cool/content';
import { createPatternTile } from '~/utils/sakura-pattern';
const props = withDefaults(
  defineProps<{
    shape?: PatternShape;
    seed?: string;
    alt?: string;
    width?: number;
    height?: number;
  }>(),
  { shape: 'heart', seed: 'owner-avatar', alt: '', width: 64, height: 64 },
);
const color = computed(
  () => createPatternTile({ seed: props.seed }).marks[0]!.color,
);
</script>
<template>
  <svg
    class="pattern-avatar"
    :data-shape="shape"
    viewBox="0 0 64 64"
    :width="width"
    :height="height"
    role="img"
    :aria-label="alt"
    focusable="false"
  >
    <g transform="translate(14 14) scale(1.5)" :fill="color">
      <PatternGlyph :shape="shape" />
    </g>
  </svg>
</template>
<style scoped>
.pattern-avatar {
  display: inline-block;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--sakura-soft);
  stroke: none;
}
</style>
