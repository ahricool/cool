<script setup lang="ts">
import './styles/index.css';
import Shell from './layouts/Shell.vue';
</script>
<template>
  <div class="minimal-site" data-theme-root="minimal">
    <Shell><slot /></Shell>
  </div>
</template>
