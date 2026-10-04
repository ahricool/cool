<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'select' | 'text' }>(), {
  variant: 'select',
});
const { locale, setLocale } = useCoolI18n();
</script>
<template>
  <div
    v-if="variant === 'text'"
    class="language-links"
    role="group"
    aria-label="Language / 语言"
  >
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
  <label v-else class="language-selector">
    <span aria-hidden="true">◎</span>
    <select
      data-testid="language-select"
      :value="locale"
      aria-label="Language / 语言"
      @change="setLocale(($event.target as HTMLSelectElement).value)"
    >
      <option value="en" lang="en">English</option>
      <option value="zh" lang="zh-CN">简体中文</option>
    </select>
  </label>
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

.language-selector {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: inherit;
  font-size: calc(13px * var(--sakura-font-scale));
}
.language-selector select {
  min-height: 36px;
  padding: 6px 24px 6px 8px;
  border: 1px solid currentColor;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.language-selector select:focus-visible {
  outline: 2px solid #e58aa3;
  outline-offset: 3px;
}
.language-selector option {
  color: #34333d;
  background: #fff;
}
</style>
