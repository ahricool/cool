<script setup lang="ts">
import './styles/index.css';
import Shell from './layouts/Shell.vue';
import SakuraPattern from './components/SakuraPattern.vue';
const store = useSiteStore();
const pagePatternSeed = useState('page-pattern-seed', () =>
  Math.random().toString(36).slice(2),
);
</script>
<template>
  <div class="app-surface" data-theme-root="default">
    <SakuraPattern
      v-if="store.site.appearance.background !== 'none'"
      :shape="store.site.appearance.background"
      :seed="pagePatternSeed"
      class="page-pattern"
    />
    <Shell><slot /></Shell>
  </div>
</template>
<style scoped>
.app-surface {
  position: relative;
  isolation: isolate;
  min-height: 100svh;
}
</style>
