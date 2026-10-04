<script setup lang="ts">
defineProps<{ title: string; titleLang?: string; cover?: string | null }>();
</script>
<template>
  <div class="page-header">
    <div class="page-artwork">
      <div class="page-cover">
        <img
          :src="cover || '/sakura/images/default/hd.webp'"
          alt=""
          width="1920"
          height="400"
        />
      </div>
    </div>
    <div class="page-heading">
      <h1 :lang="titleLang">{{ title }}</h1>
      <slot />
    </div>
  </div>
</template>
