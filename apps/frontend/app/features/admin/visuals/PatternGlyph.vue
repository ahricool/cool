<script setup lang="ts">
import type { PatternShape } from '@cool/content';
defineProps<{ shape: PatternShape }>();
</script>
<template>
  <path
    v-if="shape === 'heart'"
    d="M12 21 3.1 12.3C-2.6 6.6 5.8-1.2 12 5.3c6.2-6.5 14.6 1.3 8.9 7Z"
  />
  <path
    v-else-if="shape === 'star'"
    d="m12 1 3.4 7 7.6 1.1-5.5 5.4 1.3 7.5-6.8-3.6L5.2 22l1.3-7.5L1 9.1 8.6 8Z"
  />
  <circle v-else cx="12" cy="12" r="11" />
</template>
