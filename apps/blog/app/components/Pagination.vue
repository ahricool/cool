<script setup lang="ts">
const props = defineProps<{ total: number; page: number; pageSize: number }>();
const route = useRoute();
const pages = computed(() => Math.ceil(props.total / props.pageSize));
</script>
<template>
  <nav v-if="pages > 1" class="pagination" aria-label="分页">
    <NuxtLink
      v-if="page > 1"
      :to="{ path: route.path, query: { ...route.query, page: page - 1 } }"
      class="at_button"
      >上一页</NuxtLink
    ><span>{{ page }} / {{ pages }}</span
    ><NuxtLink
      v-if="page < pages"
      :to="{ path: route.path, query: { ...route.query, page: page + 1 } }"
      class="at_button"
      >下一页</NuxtLink
    >
  </nav>
</template>
