<template>
  <div v-if="backgrounds.length && siteStore.data.theme.theme.enableSwitcher">
    <button class="change-skin-gear" type="button" @click="show = !show">
      <Icon icon="solar:palette-round-linear" class="iconify" />
      <span>Theme</span>
    </button>
    <div class="skin-menu" :class="{ show }">
      <div class="row-container">
        <ul class="menu-list">
          <li v-for="item in backgrounds" :key="item.name" @click="select(item.name)">
            <Icon :icon="item.icon || 'solar:palette-round-linear'" class="iconify" />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import { useSiteStore } from '@/stores/site';
import { useThemeStore } from '@/stores/theme';

const show = ref(false);
const siteStore = useSiteStore();
const themeStore = useThemeStore();
const backgrounds = computed(() => siteStore.data.theme.theme.backgrounds);

function select(name: string) {
  themeStore.setBackground(name, siteStore.data);
  show.value = false;
}
</script>
