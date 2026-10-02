<script setup lang="ts">
defineProps<{ title?: string; cover?: string | null; contentClass?: string }>();
</script>
<template>
  <div class="column">
    <header class="header">
      <slot name="header"
        ><PageHeader :title="title || ''" :cover="cover"
      /></slot>
    </header>
  </div>
  <div id="content" class="main-inner site-content" :class="contentClass">
    <slot />
  </div>
</template>
