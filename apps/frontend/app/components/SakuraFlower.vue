<template>
  <span class="sakura-flower" aria-hidden="true" />
</template>

<style>
/* Existing brand, welcome and footer classes can size the shared artwork. */
:where(.sakura-flower) {
  display: inline-block;
  flex-shrink: 0;
  width: 1em;
  height: 1em;
  background: url('/sakura/images/footer/sakura.svg') center / contain no-repeat;
}
</style>
