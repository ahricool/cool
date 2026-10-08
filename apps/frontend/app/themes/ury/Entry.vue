<script setup lang="ts">
import './styles/index.css';
import Shell from './layouts/Shell.vue';
</script>
<template>
  <div class="ury-site" data-theme-root="ury">
    <Shell><slot /></Shell>
  </div>
</template>
