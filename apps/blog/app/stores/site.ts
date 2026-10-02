import { defineStore } from 'pinia';
import {
  defaultSite,
  defaultHomepage,
  type Site,
  type Homepage,
  type Social,
} from '@cms/content';
export const useSiteStore = defineStore('site', () => {
  const site = ref<Site>({ ...defaultSite });
  const homepage = ref<Homepage>({ ...defaultHomepage });
  const social = ref<Social[]>([]);
  const loaded = ref(false);
  const failed = ref(false);
  async function load() {
    if (loaded.value) return;
    try {
      const api = useApi();
      const [s, c] = await Promise.all([
        api<Site>('/public/site'),
        api<{ homepage: Homepage; social: Social[] }>('/public/config'),
      ]);
      site.value = s;
      homepage.value = c.homepage;
      social.value = c.social;
      loaded.value = true;
      failed.value = false;
    } catch {
      failed.value = true;
    }
  }
  return { site, homepage, social, loaded, failed, load };
});
