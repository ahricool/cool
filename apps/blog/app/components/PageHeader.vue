<script setup lang="ts">
defineProps<{ title: string; cover?: string | null }>();
</script>
<template>
  <div class="page-header is-decorate">
    <div class="pattern-center single-center no-select">
      <div class="pattern-attachment-img">
        <img
          :src="cover || '/sakura/images/default/hd.webp'"
          alt=""
          width="1920"
          height="400"
        />
      </div>
    </div>
    <div class="pattern-title">
      <h1>{{ title }}</h1>
      <slot />
    </div>
  </div>
</template>
