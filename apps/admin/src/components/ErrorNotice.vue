<script setup lang="ts">
defineProps<{ error: string }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <el-alert v-if="error" type="error" :closable="false" show-icon
    ><template #title>{{ error }}</template
    ><el-button text @click="$emit('retry')">重试</el-button></el-alert
  >
</template>
