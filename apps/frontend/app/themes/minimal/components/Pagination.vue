<script setup lang="ts">
defineProps<{ total: number; page: number; pageSize: number }>();
const route = useRoute();
const { t } = useCoolI18n();
</script>
<template>
  <nav
    v-if="total > pageSize"
    class="minimal-pagination"
    :aria-label="t('分页')"
  >
    <NuxtLink
      v-if="page > 1"
      :to="{ path: route.path, query: { ...route.query, page: page - 1 } }"
      >{{ t('上一页') }}</NuxtLink
    >
    <span>{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
    <NuxtLink
      v-if="page * pageSize < total"
      :to="{ path: route.path, query: { ...route.query, page: page + 1 } }"
      >{{ t('下一页') }}</NuxtLink
    >
  </nav>
</template>
