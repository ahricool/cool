<script setup lang="ts">
const store = useSiteStore();
const route = useRoute();
const { t, locale, setLocale, contentLang } = useCoolI18n();
const year = new Date().getFullYear();
// Phones fold the masthead into one line; the menu opens the navigation.
const menuOpen = ref(false);
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  },
);
useHead(() => ({ title: store.site.title }));
</script>
<template>
  <a class="ury-skip" href="#content">{{ t('跳到正文') }}</a>
  <header class="ury-masthead" :class="{ 'is-open': menuOpen }">
    <div class="ury-masthead-bar">
      <NuxtLink
        class="ury-brand ury-brand-link"
        to="/home"
        :lang="contentLang(store.site.contentLocale)"
        >{{ store.site.title }}</NuxtLink
      >
      <!-- Phones: the title itself opens and closes the navigation. -->
      <button
        type="button"
        class="ury-brand ury-brand-toggle"
        :lang="contentLang(store.site.contentLocale)"
        :aria-expanded="menuOpen"
        aria-controls="ury-menu"
        @click="menuOpen = !menuOpen"
      >
        {{ store.site.title
        }}<span class="ury-brand-mark" aria-hidden="true">{{
          menuOpen ? '−' : '+'
        }}</span>
      </button>
    </div>
    <div id="ury-menu" class="ury-menu">
      <p
        v-if="store.site.description"
        class="ury-tagline"
        :lang="contentLang(store.site.contentLocale)"
      >
        {{ store.site.description }}
      </p>
      <nav class="ury-nav" :aria-label="t('主导航')">
        <NuxtLink to="/home">{{ t('首页') }}</NuxtLink>
        <NuxtLink to="/tags">{{ t('标签') }}</NuxtLink>
        <NuxtLink to="/search">{{ t('搜索') }}</NuxtLink>
        <NuxtLink to="/about">{{ t('我') }}</NuxtLink>
      </nav>
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
    <footer class="ury-footer">
      <p class="ury-wish" lang="zh-CN">
        愿你的天空永远星光灿烂，<br />愿你的舞台永远明光幻彩。
      </p>
      <div class="ury-languages" role="group" aria-label="Language / 语言">
        <button
          type="button"
          lang="zh-CN"
          :aria-pressed="locale === 'zh'"
          @click="setLocale('zh')"
        >
          中文</button
        ><span aria-hidden="true">·</span
        ><button
          type="button"
          lang="en"
          :aria-pressed="locale === 'en'"
          @click="setLocale('en')"
        >
          English
        </button>
      </div>
      <p class="ury-colophon" :lang="contentLang(store.site.contentLocale)">
        © {{ year }} {{ store.site.title }} ·
        {{ store.site.author.displayName }}
      </p>
    </footer>
  </div>
</template>
