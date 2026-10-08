<script setup lang="ts">
defineProps<{ pending?: boolean; error?: unknown; empty?: boolean }>();
defineEmits<{ retry: [] }>();
const { t } = useCoolI18n();
</script>
<template>
  <div class="minimal-status" aria-live="polite">
    <p v-if="pending">{{ t('加载中…') }}</p>
    <div v-else-if="error" role="alert">
      {{ t('加载失败') }}
      <button @click="$emit('retry')">{{ t('重试') }}</button>
    </div>
    <p v-else-if="empty">{{ t('暂无内容') }}</p>
  </div>
</template>
