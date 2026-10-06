<script setup lang="ts">
const { appearance } = useSiteAppearanceHead();
const pagePatternSeed = useState('page-pattern-seed', () =>
  Math.random().toString(36).slice(2),
);
</script>
<template>
  <div class="app-surface">
    <SakuraPattern
      v-if="appearance.background !== 'none'"
      :shape="appearance.background"
      :seed="pagePatternSeed"
      class="page-pattern"
    />
    <NuxtLayout><NuxtPage /></NuxtLayout>
  </div>
</template>

<style scoped>
.app-surface {
  position: relative;
  isolation: isolate;
  min-height: 100svh;
}
</style>
