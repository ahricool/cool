<script setup lang="ts">
import { useId } from 'vue';
import { createPatternTile, type PatternOptions } from '~/utils/sakura-pattern';
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
      <symbol :id="`${id}-heart`" viewBox="0 0 24 24">
        <path
          d="M12 21 3.1 12.3C-2.6 6.6 5.8-1.2 12 5.3c6.2-6.5 14.6 1.3 8.9 7Z"
        />
      </symbol>
      <symbol :id="`${id}-star`" viewBox="0 0 24 24">
        <path
          d="m12 1 3.4 7 7.6 1.1-5.5 5.4 1.3 7.5-6.8-3.6L5.2 22l1.3-7.5L1 9.1 8.6 8Z"
        />
      </symbol>
      <symbol :id="`${id}-dot`" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" />
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
