<script setup lang="ts">
import ReadingBanner from '~/themes/sakura/components/ReadingBanner.vue';
defineProps<{
  title: string;
  titleLang?: string;
  cover?: string | null;
  fallback?: 'illustration' | 'cover' | 'none';
  seed?: string;
}>();
</script>
<template>
  <ReadingBanner :cover="cover" :fallback="fallback" :seed="seed">
    <div class="page-heading">
      <h1 :lang="titleLang">{{ title }}</h1>
      <slot />
    </div>
  </ReadingBanner>
</template>
