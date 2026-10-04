<script setup lang="ts">
const { t, locale, routePath, contentLang } = useCoolI18n();
import type { NuxtError } from '#app';
defineProps<{ error: NuxtError }>();
const route = useRoute();
const dark = useCoolTheme();
const isAdmin = computed(() => /^\/admin(?:\/|$)/.test(route.path));
useHead(() => ({
  title: `${t('暂时迷路了')} · 梦桜`,
  htmlAttrs: {
    lang: contentLang(locale.value),
    'data-surface': isAdmin.value ? 'admin' : 'blog',
    class: dark.value ? 'dark' : '',
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
        class="primary-action"
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
    linear-gradient(
      color-mix(in srgb, var(--sakura-page) 90%, transparent),
      color-mix(in srgb, var(--sakura-page) 96%, transparent)
    ),
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
  background: var(--sakura-surface);
  box-shadow: var(--sakura-shadow);
}
.error-flower {
  width: 72px;
  height: 72px;
}
.eyebrow {
  color: var(--sakura-muted);
  font-size: calc(12px * var(--sakura-font-scale));
  letter-spacing: 2px;
}
h1 {
  color: var(--sakura-heading);
  font-size: calc(clamp(22px, 4vw, 30px) * var(--sakura-font-scale));
}
button {
  margin-top: 16px;
}
</style>
