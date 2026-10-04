<script setup lang="ts">
const { t, locale, routePath, contentLang } = useCoolI18n();
import type { NuxtError } from '#app';
defineProps<{ error: NuxtError }>();
const route = useRoute();
const isAdmin = computed(() => /^\/admin(?:\/|$)/.test(route.path));
useHead(() => ({
  title: `${t('暂时迷路了')} · 梦桜`,
  htmlAttrs: {
    lang: contentLang(locale.value),
    'data-surface': isAdmin.value ? 'admin' : 'blog',
  },
  bodyAttrs: { class: isAdmin.value ? 'admin-ui' : 'sakura-ui' },
}));
</script>
<template>
  <main class="error-page">
    <section class="error-card" aria-labelledby="error-title">
      <SakuraFlower class="error-flower" />
      <p class="eyebrow">{{ t('小小的绕路') }} · {{ error.statusCode }}</p>
      <h1 id="error-title">{{ t('这个页面暂时不在这里。') }}</h1>
      <p>{{ t('也许只是转错了一个路口，回去继续你的故事吧。') }}</p>
      <button
        @click="clearError({ redirect: isAdmin ? '/admin' : routePath('/') })"
      >
        {{ t(isAdmin ? '返回工作空间' : '返回首页') }}
      </button>
    </section>
  </main>
</template>
<style scoped>
.error-page {
  display: grid;
  min-height: 100svh;
  place-items: center;
  padding: 24px;
  box-sizing: border-box;
  background:
    linear-gradient(#fff5f9e8, #fcf8fbef),
    url('/sakura/images/default/hd.webp') center / cover;
  color: var(--sakura-text);
  font-family: var(--sakura-font);
}
.error-card {
  width: min(100%, 580px);
  padding: clamp(24px, 5vw, 56px);
  box-sizing: border-box;
  text-align: center;
  border: 1px solid var(--sakura-border);
  border-radius: 24px;
  background: #ffffffed;
  box-shadow: var(--sakura-shadow);
}
.error-flower {
  width: 72px;
  height: 72px;
}
.eyebrow {
  color: var(--sakura-muted);
  font-size: 12px;
  letter-spacing: 2px;
}
h1 {
  color: var(--sakura-heading);
  font-size: clamp(22px, 4vw, 30px);
}
button {
  margin-top: 16px;
  padding: 12px 24px;
  border: 0;
  border-radius: 10px;
  background: var(--sakura-accent);
  color: white;
  font: inherit;
  cursor: pointer;
}
button:focus-visible {
  outline: 2px solid var(--sakura-accent);
  outline-offset: 4px;
}
</style>
