import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getBootstrap, type BootstrapData, type PageSummary, type PostSummary } from '@/services/api';

const defaultState: BootstrapData = {
  site: {
    title: 'Sakura',
    subtitle: '',
    description: '',
    logo: '',
    favicon: '',
    url: '',
  },
  navigation: [],
  socialLinks: [],
  noticeTitle: '',
  theme: {
    general: {
      themeSkin: '#fe9600',
      listType: 'imageflow',
    },
    hero: {
      enabled: true,
      backgroundImage: '',
      backgroundFilter: 'filter-grid',
      titleStyle: 'glitch-text',
      glitchText: 'Hi, Friend',
      intro: '',
      showSocials: true,
      fullScreen: true,
      wave: false,
      showScrollDown: true,
    },
    focus: {
      enabled: true,
      title: '聚焦',
      icon: 'fa:anchor',
      items: [],
    },
    footer: {
      logo: '/assets/images/footer/sakura.svg',
      icp: '',
      police: '',
      policeCode: '',
    },
    theme: {
      enableSwitcher: true,
      backgrounds: [],
    },
    author: {
      name: '',
      avatar: '',
      bio: '',
      email: '',
      location: '',
      backgroundImage: '',
    },
  },
  posts: [],
  pages: [],
  tags: [],
  categories: [],
  friendLinks: [],
};

export const useSiteStore = defineStore('site', () => {
  const data = ref<BootstrapData>(defaultState);
  const loading = ref(false);
  const error = ref('');

  const posts = computed(() => data.value.posts);
  const pages = computed(() => data.value.pages);

  async function bootstrap() {
    loading.value = true;
    error.value = '';
    try {
      data.value = await getBootstrap();
      updateHead();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载站点配置失败';
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  function updateHead() {
    document.title = data.value.site.subtitle
      ? `${data.value.site.title} - ${data.value.site.subtitle}`
      : data.value.site.title;

    if (data.value.site.description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', data.value.site.description);
    }

    if (data.value.site.favicon) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = data.value.site.favicon;
    }
  }

  function getPostSummary(slug: string): PostSummary | undefined {
    return posts.value.find((item) => item.slug === slug);
  }

  function getPageSummary(slug: string): PageSummary | undefined {
    return pages.value.find((item) => item.slug === slug);
  }

  return {
    data,
    posts,
    pages,
    loading,
    error,
    bootstrap,
    getPostSummary,
    getPageSummary,
  };
});
