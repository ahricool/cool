<script setup lang="ts">
const { t, routePath } = useCoolI18n();
</script>

<template>
  <div class="reading-controls" role="group" :aria-label="t('阅读工具')">
    <NuxtLink
      :to="routePath('/search')"
      class="reading-control"
      :aria-label="t('搜索')"
      :title="t('搜索')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="10.75" cy="10.75" r="6.75" />
        <path d="m16 16 4.25 4.25" />
      </svg>
    </NuxtLink>
  </div>
</template>
