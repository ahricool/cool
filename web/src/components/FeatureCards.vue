<template>
  <div v-if="focus.enabled && focus.items.length" class="top-feature">
    <h1 class="fes-title" style="font-family: 'Ubuntu', sans-serif">
      <Icon v-if="focus.icon" :icon="focus.icon" class="iconify" />
      <span>{{ focus.title || '聚焦' }}</span>
    </h1>

    <div class="top-feature-inner">
      <div v-for="item in focus.items" :key="item.id" class="top-feature-item">
        <div class="feature-container">
          <a :href="item.link" target="_blank" rel="noreferrer">
            <img v-if="item.image" :src="item.image" :alt="item.title" width="780" height="160" />
            <div class="info">
              <h3><span>{{ item.title }}</span></h3>
              <p><span>{{ item.description }}</span></p>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useSiteStore } from '@/stores/site';

const siteStore = useSiteStore();
const focus = computed(() => siteStore.data.theme.focus);
</script>
