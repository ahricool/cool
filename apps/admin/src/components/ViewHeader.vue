<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>
<template>
  <header class="view-header">
    <div>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div class="view-actions"><slot /></div>
  </header>
</template>
