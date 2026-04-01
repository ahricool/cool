import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ThemeSettings {
  darkMode: boolean;
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  showSidebar: boolean;
  enablePjax: boolean;
  enableLazyLoad: boolean;
}

export const useThemeStore = defineStore('theme', () => {
  // State
  const settings = ref<ThemeSettings>({
    darkMode: false,
    primaryColor: '#FE9A9A',
    fontSize: 'medium',
    showSidebar: true,
    enablePjax: true,
    enableLazyLoad: true,
  });

  // Actions
  function toggleDarkMode() {
    settings.value.darkMode = !settings.value.darkMode;
    localStorage.setItem('theme_darkMode', String(settings.value.darkMode));
  }

  function toggleSidebar() {
    settings.value.showSidebar = !settings.value.showSidebar;
    localStorage.setItem('theme_showSidebar', String(settings.value.showSidebar));
  }

  function setFontSize(size: 'small' | 'medium' | 'large') {
    settings.value.fontSize = size;
    localStorage.setItem('theme_fontSize', size);
  }

  function setPrimaryColor(color: string) {
    settings.value.primaryColor = color;
    localStorage.setItem('theme_primaryColor', color);
  }

  function loadSettings() {
    const darkMode = localStorage.getItem('theme_darkMode');
    if (darkMode !== null) {
      settings.value.darkMode = darkMode === 'true';
    }

    const fontSize = localStorage.getItem('theme_fontSize');
    if (fontSize) {
      settings.value.fontSize = fontSize as 'small' | 'medium' | 'large';
    }

    const primaryColor = localStorage.getItem('theme_primaryColor');
    if (primaryColor) {
      settings.value.primaryColor = primaryColor;
    }

    const showSidebar = localStorage.getItem('theme_showSidebar');
    if (showSidebar !== null) {
      settings.value.showSidebar = showSidebar === 'true';
    }
  }

  return {
    settings,
    toggleDarkMode,
    toggleSidebar,
    setFontSize,
    setPrimaryColor,
    loadSettings,
  };
});
