<script setup lang="ts">
import PatternGlyph from '~/themes/sakura/components/PatternGlyph.vue';
import { useId } from 'vue';
import {
  createPatternTile,
  type PatternOptions,
} from '~/themes/sakura/utils/sakura-pattern';
const props = defineProps<PatternOptions & { opacity?: number }>();
const id = `sakura-${useId()}`;
const tile = computed(() => createPatternTile(props));
const style = computed(() => ({
  opacity:
    props.opacity === undefined
      ? 'var(--sakura-pattern-opacity, 0.45)'
      : Math.min(1, Math.max(0, props.opacity)),
}));
</script>
<template>
  <svg
    class="sakura-pattern"
    :style="style"
    aria-hidden="true"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <symbol :id="`${id}-${tile.shape}`" viewBox="0 0 24 24">
        <PatternGlyph :shape="tile.shape" />
      </symbol>
      <pattern
        :id="id"
        patternUnits="userSpaceOnUse"
        :width="tile.width"
        :height="tile.height"
      >
        <use
          v-for="mark in tile.marks"
          :key="mark.key"
          :href="`#${id}-${mark.shape}`"
          :x="mark.x - tile.size / 2"
          :y="mark.y - tile.size / 2"
          :width="tile.size"
          :height="tile.size"
          :fill="mark.color"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" :fill="`url(#${id})`" />
  </svg>
</template>
<style scoped>
.sakura-pattern {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  stroke: none;
}
</style>
