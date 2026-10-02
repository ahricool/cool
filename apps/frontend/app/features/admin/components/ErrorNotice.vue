<script setup lang="ts">
import { useCmsI18n } from '~/composables/useCmsI18n';
const { t } = useCmsI18n();
defineProps<{ error: string }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <el-alert v-if="error" type="error" :closable="false" show-icon
    ><template #title>{{ t(error) }}</template
    ><el-button text @click="$emit('retry')">{{
      t('重试')
    }}</el-button></el-alert
  >
</template>
