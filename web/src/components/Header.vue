<template>
  <div class="header-wrapper">
    <div class="site-branding">
      <router-link to="/" class="site-title">
        <img v-if="siteStore.config.logo" :src="siteStore.config.logo" alt="Logo" class="site-logo" />
        <h1>{{ siteStore.config.title }}</h1>
      </router-link>
      <p v-if="siteStore.config.subtitle" class="site-description">
        {{ siteStore.config.subtitle }}
      </p>
    </div>

    <nav class="site-navigation">
      <ul class="nav-menu">
        <li v-for="item in navItems" :key="item.to">
          <router-link :to="item.to">{{ item.label }}</router-link>
        </li>
      </ul>
    </nav>

    <div class="header-actions">
      <button @click="themeStore.toggleDarkMode()" class="theme-toggle" :title="themeStore.settings.darkMode ? 'Light Mode' : 'Dark Mode'">
        <span v-if="themeStore.settings.darkMode">☀️</span>
        <span v-else>🌙</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useSiteStore } from '../stores/site';
import { useThemeStore } from '../stores/theme';
import { api, type Page } from '../services/api';

const siteStore = useSiteStore();
const themeStore = useThemeStore();
const navigationPages = ref<Page[]>([]);

onMounted(async () => {
  try {
    const response = await api.getPages({ size: 20 });
    navigationPages.value = response.items.slice(0, 5);
  } catch (error) {
    console.warn('Failed to load navigation pages:', error);
    navigationPages.value = [];
  }
});

const navItems = computed(() => [
  { to: '/', label: 'Home' },
  { to: '/archive', label: 'Archive' },
  ...navigationPages.value.map((page) => ({
    to: `/page/${page.slug}`,
    label: page.title,
  })),
]);
</script>

<style scoped>
.header-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  gap: 2rem;
}

.site-branding {
  display: flex;
  flex-direction: column;
}

.site-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: inherit;
}

.site-logo {
  height: 40px;
  width: auto;
}

.site-title h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #FE9A9A;
}

.site-description {
  margin: 0;
  font-size: 0.875rem;
  color: #666;
}

.site-navigation {
  flex: 1;
}

.nav-menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 2rem;
  justify-content: center;
}

.nav-menu a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-menu a:hover,
.nav-menu a.router-link-active {
  color: #FE9A9A;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.theme-toggle {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background 0.3s;
}

.theme-toggle:hover {
  background: rgba(0, 0, 0, 0.05);
}

@media (max-width: 768px) {
  .header-wrapper {
    flex-wrap: wrap;
    padding: 1rem;
  }

  .site-navigation {
    order: 3;
    flex-basis: 100%;
  }

  .nav-menu {
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
