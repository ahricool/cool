<template>
  <div class="header-before">
    <button class="nav-toggle-btn" type="button" @click="themeStore.toggleMobileSidebar">
      <Icon icon="solar:hamburger-menu-outline" class="iconify" />
    </button>
    <RouterLink class="site-brand" to="/">
      <img v-if="siteStore.data.site.logo" :src="siteStore.data.site.logo" :alt="siteStore.data.site.title" />
      <span v-else>{{ siteStore.data.site.title }}</span>
    </RouterLink>
  </div>

  <div class="header-content">
    <div class="lower-container">
      <div class="lower">
        <nav class="site-menu">
          <component
            :is="item.external ? 'a' : RouterLink"
            v-for="item in siteStore.data.navigation"
            :key="item.path"
            :href="item.external ? item.path : undefined"
            :to="item.external ? undefined : item.path"
            :target="item.external ? '_blank' : undefined"
            rel="noreferrer"
          >
            {{ item.label }}
          </component>
        </nav>
      </div>
    </div>
  </div>

  <div class="header-after">
    <RouterLink class="iconsearch" to="/search" aria-label="搜索">
      <Icon icon="solar:magnifer-linear" class="iconify" />
    </RouterLink>
    <RouterLink class="header-user-link" to="/author" aria-label="作者页">
      <Icon icon="solar:user-linear" class="iconify" />
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { RouterLink } from 'vue-router';
import { useSiteStore } from '@/stores/site';
import { useThemeStore } from '@/stores/theme';

const siteStore = useSiteStore();
const themeStore = useThemeStore();
</script>
