<template>
  <AppShell>
    <template #header>
      <PageBanner title="404" subtitle="页面走丢了" />
    </template>

    <div id="primary" class="content-area not-found-page">
      <RouterLink to="/" class="button-normal">返回首页</RouterLink>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import PageBanner from '@/components/PageBanner.vue';
</script>
