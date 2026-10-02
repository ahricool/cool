<script setup lang="ts">
import icons from '~/assets/icons.json';
defineProps<{ name: keyof typeof icons }>();
</script>
<template>
  <svg
    class="iconify"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    aria-hidden="true"
    v-html="icons[name]"
  ></svg>
</template>
