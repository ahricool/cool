<script setup lang="ts">
defineProps<{ dark: boolean; floating?: boolean }>();
defineEmits<{ toggleTheme: [] }>();
const { t } = useCoolI18n();
</script>
<template>
  <button
    type="button"
    class="reading-control"
    :class="{ 'floating-theme': floating }"
    :aria-pressed="dark"
    :aria-label="t(dark ? '切换浅色' : '切换深色')"
    :title="t(dark ? '切换浅色' : '切换深色')"
    @click="$emit('toggleTheme')"
  >
    <svg
      class="navigation-icon"
      v-if="dark"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
      />
    </svg>
    <svg
      class="navigation-icon"
      v-else
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.2 14.15A8.4 8.4 0 0 1 9.85 3.8a8.4 8.4 0 1 0 10.35 10.35Z" />
    </svg>
  </button>
</template>
