<script setup lang="ts">
import mark from '../assets/mark.svg';
import { resolveCustomImage } from '~/utils/custom-image';
import { useUryAppearance } from '../composables/useUryAppearance';
const store = useSiteStore();
const { settings, preference } = useUryAppearance();
const { t, locale, setLocale, contentLang } = useCoolI18n();
useHead(() => ({ title: store.site.title }));
</script>
<template>
  <a class="ury-skip" href="#content">{{ t('跳到正文') }}</a>
  <header class="ury-masthead">
    <div :lang="contentLang(store.site.contentLocale)">
      <img
        v-if="settings.showAvatar"
        class="ury-avatar"
        :src="resolveCustomImage(store.site.author.avatarUrl) ?? mark"
        width="64"
        height="64"
        :alt="store.site.author.displayName"
      />
      <NuxtLink class="ury-brand" to="/">{{ store.site.title }}</NuxtLink>
      <p class="ury-tagline">{{ store.site.description }}</p>
    </div>
    <nav class="ury-nav" :aria-label="t('主导航')">
      <NuxtLink to="/">{{ t('首页') }}</NuxtLink>
      <NuxtLink to="/tags">{{ t('标签') }}</NuxtLink>
      <NuxtLink to="/search">{{ t('搜索') }}</NuxtLink>
      <NuxtLink to="/about">{{ t('我') }}</NuxtLink>
    </nav>
    <div class="ury-preferences">
      <label>
        <span id="ury-language-label">Language / 语言</span>
        <select
          aria-labelledby="ury-language-label"
          :value="locale"
          @change="setLocale(($event.target as HTMLSelectElement).value)"
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </label>
      <label>
        <span id="ury-palette-label">{{ t('配色') }}</span>
        <select
          aria-labelledby="ury-palette-label"
          :value="preference ?? ''"
          @change="
            preference = ($event.target as HTMLSelectElement).value || null
          "
        >
          <option value="">{{ t('网站默认') }}</option>
          <option value="light">{{ t('浅色') }}</option>
          <option value="sepia">{{ t('暖纸色') }}</option>
          <option value="dark">{{ t('深色') }}</option>
        </select>
      </label>
    </div>
  </header>
  <div class="ury-content-column">
    <main id="content" class="ury-main" tabindex="-1">
      <div v-if="store.failed" role="alert" class="ury-status">
        {{ t('网站配置加载失败') }}
        <button @click="store.load(true)">{{ t('重试') }}</button>
      </div>
      <slot />
    </main>
    <footer class="ury-footer" :lang="contentLang(store.site.contentLocale)">
      {{ store.site.title }} · {{ store.site.author.displayName }}
    </footer>
  </div>
</template>
