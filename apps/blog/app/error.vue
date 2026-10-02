<script setup lang="ts">
defineProps<{ error: { statusCode: number; message: string } }>();
</script>
<template>
  <NuxtLayout
    ><div class="api-state">
      <h1>{{ error.statusCode }}</h1>
      <p>这个页面暂时不在这里。</p>
      <a href="/">返回首页</a>
    </div></NuxtLayout
  >
</template>
