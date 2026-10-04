<script setup lang="ts">
defineProps<{ spinning?: boolean }>();
</script>
<template>
  <span
    class="sakura-flower"
    :class="{ 'sakura-flower--spinning': spinning }"
    aria-hidden="true"
  />
</template>
<style>
:where(.sakura-flower) {
  display: inline-block;
  flex-shrink: 0;
  width: 1em;
  height: 1em;
  color: var(--sakura-flower-color);
  opacity: 0.8;
  background: currentColor;
  mask: url('/sakura/images/footer/sakura.svg') center / contain no-repeat;
  transform-origin: center;
}
.sakura-flower--spinning {
  animation: footer-sakura-spin 12s linear infinite;
}
@keyframes footer-sakura-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .sakura-flower--spinning {
    animation: none;
  }
}
</style>
