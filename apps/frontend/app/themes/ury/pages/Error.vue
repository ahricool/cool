<script setup lang="ts">
import type { NuxtError } from '#app';
import '../styles/index.css';
defineProps<{ error: NuxtError }>();
const store = useSiteStore();
const { t, contentLang } = useCoolI18n();
useHead(() => ({ title: `${t('暂时迷路了')} · ${store.site.title}` }));
</script>
<template>
  <main class="ury-error" data-theme-root="ury">
    <p class="ury-brand" :lang="contentLang(store.site.contentLocale)">
      {{ store.site.title }}
    </p>
    <p class="ury-error-code">{{ error.statusCode }}</p>
    <h1>{{ t('这个页面暂时不在这里。') }}</h1>
    <p>{{ t('也许只是转错了一个路口，回去继续你的故事吧。') }}</p>
    <button type="button" @click="clearError({ redirect: '/home' })">
      {{ t('返回首页') }} <span aria-hidden="true">→</span>
    </button>
  </main>
</template>
