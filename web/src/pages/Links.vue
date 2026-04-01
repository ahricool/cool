<template>
  <AppShell>
    <template #header>
      <PageBanner title="友情链接" subtitle="欢迎交换链接" />
    </template>

    <div id="primary" class="content-area">
      <article class="link-article">
        <div v-for="group in groups" :key="group.name" class="links">
          <h3 class="link-title"><span class="fake-title">{{ group.name }}</span></h3>
          <ul class="link-items">
            <li v-for="item in group.items" :key="item.id" class="link-item">
              <a class="link-item-inner" :href="item.url" :title="item.name" target="_blank" rel="noopener noreferrer">
                <img v-if="item.logo" :src="item.logo" :alt="item.name" width="65" height="65" />
                <span class="sitename">{{ item.name }}</span>
                <div class="linkdes">{{ item.description }}</div>
              </a>
            </li>
          </ul>
        </div>
      </article>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppShell from '@/components/AppShell.vue';
import PageBanner from '@/components/PageBanner.vue';
import { useSiteStore } from '@/stores/site';

const siteStore = useSiteStore();
const groups = computed(() => {
  const map = new Map<string, typeof siteStore.data.friendLinks>();
  siteStore.data.friendLinks.forEach((item) => {
    const items = map.get(item.group) || [];
    items.push(item);
    map.set(item.group, items);
  });
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
});
</script>
