<script setup lang="ts">
const { locale, setLocale } = useCmsI18n();
</script>
<template>
  <label class="language-selector">
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
.language-selector {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: inherit;
  font-size: 13px;
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
