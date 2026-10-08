<script setup lang="ts">
import type { NuxtError } from '#app';
import '../styles/index.css';
import mark from '../assets/mark.svg';
defineProps<{ error: NuxtError }>();
const { t } = useCoolI18n();
useHead(() => ({ title: `${t('暂时迷路了')} · Ury` }));
</script>
<template>
  <main class="ury-error" data-theme-root="ury">
    <img :src="mark" width="48" height="48" alt="" />
    <p>{{ error.statusCode }}</p>
    <h1>{{ t('这个页面暂时不在这里。') }}</h1>
    <p>{{ t('也许只是转错了一个路口，回去继续你的故事吧。') }}</p>
    <button @click="clearError({ redirect: '/' })">{{ t('返回首页') }}</button>
  </main>
</template>
