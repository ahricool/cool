import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { BootstrapData, ThemeBackground } from '@/services/api';

function getBackgrounds(data?: BootstrapData) {
  return data?.theme.theme.backgrounds || [];
}

function getDefaultBackground(backgrounds: ThemeBackground[]) {
  return backgrounds.find((item) => item.default) || backgrounds[0] || null;
}

function getFilter(value?: string) {
  switch (value) {
    case 'filter-undertint':
      return 'rgba(255, 255, 255, .3)';
    case 'filter-dim':
      return 'rgba(0, 0, 0, .3)';
    case 'filter-grid':
      return 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)';
    default:
      return 'none';
  }
}

export const useThemeStore = defineStore('theme', () => {
  const selectedBackground = ref('');
  const mobileSidebarOpen = ref(false);

  const currentBackground = computed(() => selectedBackground.value);

  function initialize(data?: BootstrapData) {
    const stored = localStorage.getItem('sakura_background');
    const backgrounds = getBackgrounds(data);
    selectedBackground.value = stored || getDefaultBackground(backgrounds)?.name || '';
    applyTheme(data);
  }

  function applyTheme(data?: BootstrapData) {
    if (!data) {
      return;
    }

    const root = document.documentElement;
    const hero = data.theme.hero;
    const theme = data.theme.general;
    const backgrounds = getBackgrounds(data);
    const active = backgrounds.find((item) => item.name === selectedBackground.value) || getDefaultBackground(backgrounds);

    root.style.setProperty('--theme-color', theme.themeSkin || '#fe9600');
    root.style.setProperty('--loading-image', "url('/assets/images/load/rotating-ball-o.svg')");
    root.style.setProperty('--first-screen-height', hero.fullScreen ? '100vh' : '50vh');
    root.style.setProperty('--first-screen-after', hero.fullScreen ? 'none' : 'block');
    root.style.setProperty('--first-screen-filter-images', getFilter(hero.backgroundFilter));

    document.body.classList.toggle('dark', Boolean(active?.night));
    if (active?.name) {
      localStorage.setItem('sakura_background', active.name);
    }
  }

  function backgroundStyle(data?: BootstrapData) {
    const backgrounds = getBackgrounds(data);
    const active = backgrounds.find((item) => item.name === selectedBackground.value) || getDefaultBackground(backgrounds);
    const url = active?.url || '';
    if (!url) {
      return {
        backgroundImage: 'none',
        backgroundSize: 'cover',
      };
    }
    return {
      backgroundImage: `url(${url})`,
      backgroundSize: active?.strategy === 'repeat' ? 'auto' : 'cover',
      backgroundRepeat: active?.strategy === 'repeat' ? 'repeat' : 'no-repeat',
      backgroundPosition: 'center center',
    };
  }

  function setBackground(name: string, data?: BootstrapData) {
    selectedBackground.value = name;
    applyTheme(data);
  }

  function toggleMobileSidebar() {
    mobileSidebarOpen.value = !mobileSidebarOpen.value;
  }

  function closeMobileSidebar() {
    mobileSidebarOpen.value = false;
  }

  return {
    currentBackground,
    mobileSidebarOpen,
    initialize,
    applyTheme,
    backgroundStyle,
    setBackground,
    toggleMobileSidebar,
    closeMobileSidebar,
  };
});
