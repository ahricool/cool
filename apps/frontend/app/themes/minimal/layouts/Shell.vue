<script setup lang="ts">
import mark from '../assets/mark.svg';
const store = useSiteStore();
const dark = useCoolTheme();
const { t, locale, setLocale, contentLang } = useCoolI18n();
useHead(() => ({ title: store.site.title }));
</script>
<template>
  <a class="minimal-skip" href="#content">{{ t('跳到正文') }}</a>
  <header class="minimal-masthead">
    <NuxtLink class="minimal-brand" to="/"
      ><img :src="mark" width="32" height="32" alt="" />{{
        store.site.title
      }}</NuxtLink
    >
    <nav class="minimal-nav" :aria-label="t('主导航')">
      <NuxtLink to="/">{{ t('首页') }}</NuxtLink>
      <NuxtLink to="/search">{{ t('搜索') }}</NuxtLink>
      <NuxtLink to="/about">{{ t('我') }}</NuxtLink>
      <label class="minimal-language"
        >Language / 语言
        <select
          :value="locale"
          @change="setLocale(($event.target as HTMLSelectElement).value)"
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </label>
      <button
        type="button"
        :aria-pressed="dark"
        :aria-label="t(dark ? '切换浅色' : '切换深色')"
        @click="dark = !dark"
      >
        {{ dark ? '☀' : '☾' }}
      </button>
    </nav>
  </header>
  <main id="content" class="minimal-main">
    <div v-if="store.failed" role="alert">
      {{ t('网站配置加载失败') }}
      <button @click="store.load(true)">{{ t('重试') }}</button>
    </div>
    <slot />
  </main>
  <footer class="minimal-footer" :lang="contentLang(store.site.contentLocale)">
    {{ store.site.title }} · {{ store.site.description }}
  </footer>
</template>
