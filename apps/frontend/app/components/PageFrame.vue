<script setup lang="ts">
defineProps<{
  title?: string;
  titleLang?: string;
  cover?: string | null;
  contentClass?: string;
}>();
</script>
<template>
  <header class="page-banner">
    <slot name="header"
      ><PageHeader :title="title || ''" :cover="cover" :title-lang="titleLang"
    /></slot>
  </header>
  <div id="content" class="page-content" :class="contentClass">
    <slot />
  </div>
</template>
