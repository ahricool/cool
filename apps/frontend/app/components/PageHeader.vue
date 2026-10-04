<script setup lang="ts">
defineProps<{ title: string; titleLang?: string; cover?: string | null }>();
</script>
<template>
  <ReadingBanner :cover="cover">
    <div class="page-heading">
      <h1 :lang="titleLang">{{ title }}</h1>
      <slot />
    </div>
  </ReadingBanner>
</template>
