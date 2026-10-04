<script setup lang="ts">
import wordmark from '~/assets/brand/yume-sakura.svg?raw';
</script>
<template>
  <span class="sakura-wordmark" aria-hidden="true" v-html="wordmark" />
</template>
<style scoped>
.sakura-wordmark {
  display: block;
  flex-shrink: 0;
  width: var(--wordmark-width, 86px);
  color: var(--sakura-accent);
}
.sakura-wordmark :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
</style>
