<script setup lang="ts">
import ReadingIcon from '~/themes/sakura/components/ReadingIcon.vue';
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
      <ReadingIcon name="search" />
    </NuxtLink>
  </div>
</template>
