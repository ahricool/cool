<script setup lang="ts">
const { locale, setLocale } = useCoolI18n();
</script>
<template>
  <div class="language-links" role="group" aria-label="Language / 语言">
    <button
      type="button"
      lang="en"
      :aria-pressed="locale === 'en'"
      @click="setLocale('en')"
    >
      English
    </button>
    <button
      type="button"
      lang="zh-CN"
      :aria-pressed="locale === 'zh'"
      @click="setLocale('zh')"
    >
      中文
    </button>
  </div>
</template>
<style scoped>
.language-links {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  font-size: calc(12px * var(--sakura-font-scale));
  line-height: 1.9;
}
.language-links button {
  appearance: none;
  border: 0;
  padding: 2px 0;
  background: none;
  box-shadow: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.language-links button:hover,
.language-links button[aria-pressed='true'] {
  color: var(--sakura-accent-strong);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.language-links button:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 3px;
}
</style>
