import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, type SiteConfig } from '../services/api';

export const useSiteStore = defineStore('site', () => {
  // State
  const config = ref<SiteConfig>({
    title: 'My Blog',
    subtitle: '',
    description: '',
    logo: '',
    favicon: '/favicon.ico',
    url: '',
  });

  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const siteTitle = computed(() => config.value.title);
  const siteSubtitle = computed(() => config.value.subtitle);

  // Actions
  async function fetchConfig() {
    loading.value = true;
    error.value = null;
    try {
      config.value = await api.getSiteConfig();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch site config';
      console.warn('Failed to fetch site config, using defaults:', e);
    } finally {
      loading.value = false;
    }
  }

  function updateConfig(newConfig: Partial<SiteConfig>) {
    config.value = { ...config.value, ...newConfig };
  }

  return {
    config,
    loading,
    error,
    siteTitle,
    siteSubtitle,
    fetchConfig,
    updateConfig,
  };
});
