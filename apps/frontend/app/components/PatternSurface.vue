<script setup lang="ts">
import type { PatternShape } from '@cool/content';
defineProps<{ shape: PatternShape; seed?: string; label?: string }>();
</script>
<template>
  <div
    class="pattern-surface"
    :data-shape="shape"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="!label"
  >
    <SakuraPattern :shape="shape" :seed="seed" />
  </div>
</template>
<style scoped>
.pattern-surface {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  height: 100%;
  background: var(--sakura-page);
}
</style>
