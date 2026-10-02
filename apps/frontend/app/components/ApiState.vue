<script setup lang="ts">
const { t } = useCoolI18n();
defineProps<{ pending?: boolean; error?: unknown; empty?: boolean }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="pending" class="api-state" role="status">{{ t('正在加载…') }}</div>
  <div v-else-if="error" class="api-state" role="alert">
    <p>{{ t('暂时无法加载内容。') }}</p>
    <button @click="$emit('retry')">{{ t('重新加载') }}</button>
  </div>
  <div v-else-if="empty" class="api-state">
    {{ t('这里还没有内容，慢慢来，故事总会发生。') }}
  </div>
</template>
