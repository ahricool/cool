<script setup lang="ts">
defineProps<{
  title: string;
  titleLang?: string;
  cover?: string | null;
  fallback?: 'illustration' | 'cover';
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
