<template>
  <div class="page-header" :class="{ 'is-decorate': Boolean(image) }">
    <div v-if="image" class="pattern-center single-center no-select">
      <div class="pattern-attachment-img" itemscope itemtype="http://schema.org/ImageGallery">
        <img :src="image" :alt="title" width="1920" height="400" />
      </div>
    </div>
    <div class="pattern-title" itemprop="name headline">
      <slot>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="pattern-subtitle">{{ subtitle }}</p>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  image?: string;
}>();
</script>
