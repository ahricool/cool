<script setup lang="ts">
defineProps<{ dark: boolean }>();
defineEmits<{ toggleTheme: [] }>();
const { t, routePath } = useCoolI18n();
</script>

<template>
  <div class="reading-controls" role="group" :aria-label="t('阅读工具')">
    <NuxtLink
      :to="routePath('/search')"
      class="reading-control"
      :aria-label="t('搜索')"
      :title="t('搜索')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="10.75" cy="10.75" r="6.75" />
        <path d="m16 16 4.25 4.25" />
      </svg>
    </NuxtLink>
    <span class="control-divider" aria-hidden="true" />
    <button
      type="button"
      class="reading-control"
      :aria-pressed="dark"
      :aria-label="t(dark ? '切换浅色' : '切换深色')"
      :title="t(dark ? '切换浅色' : '切换深色')"
      @click="$emit('toggleTheme')"
    >
      <svg v-if="dark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
        />
      </svg>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M20.2 14.15A8.4 8.4 0 0 1 9.85 3.8a8.4 8.4 0 1 0 10.35 10.35Z"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.reading-controls {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 3px;
  border: 1px solid var(--sakura-border);
  border-radius: 999px;
  background: var(--sakura-surface);
}
.reading-control {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--sakura-muted);
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}
.reading-control svg {
  display: block;
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.65;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.reading-control:hover,
.reading-control.router-link-active,
.reading-control[aria-pressed='true'] {
  background: var(--sakura-soft);
  color: var(--sakura-accent);
}
.reading-control:focus-visible {
  outline: 2px solid var(--sakura-accent);
  outline-offset: 2px;
}
.reading-control:active {
  background: var(--sakura-accent-light-7);
  color: var(--sakura-accent-strong);
}
.control-divider {
  width: 1px;
  height: 16px;
  margin-inline: 3px;
  background: var(--sakura-border);
}
@media (prefers-reduced-motion: reduce) {
  .reading-control {
    transition: none;
  }
}
</style>
