<script setup lang="ts">
withDefaults(defineProps<{ spinning?: boolean }>(), { spinning: false });
</script>
<template>
  <img
    src="/sakura/images/footer/sakura.svg"
    alt=""
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
  opacity: 0.8;
  object-fit: contain;
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
