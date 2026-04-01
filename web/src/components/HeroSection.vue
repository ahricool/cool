<template>
  <div class="headertop">
    <figure id="centerbg" class="centerbg">
      <img class="cover-bg" :src="heroImage" alt="home background" />
      <div class="blend-overlay"></div>
      <div class="focusinfo">
        <div v-if="hero.titleStyle === 'avatar'" class="header-tou no-select">
          <RouterLink to="/">
            <img :src="avatarImage" :alt="siteStore.data.site.title" width="120" height="120" />
          </RouterLink>
        </div>
        <h1 v-else class="center-text glitch" :data-text="hero.glitchText">{{ hero.glitchText }}</h1>

        <div class="header-info no-select" :class="{ 'info-desc': !hero.intro }">
          <p v-if="hero.intro" class="flex-child-center">
            <Icon icon="fa6-solid:quote-left" class="iconify" />
            <span class="desc">{{ hero.intro }}</span>
            <Icon icon="fa6-solid:quote-right" class="iconify" />
          </p>
          <div v-if="hero.showSocials && siteStore.data.socialLinks.length" class="top-social">
            <ul>
              <li v-for="item in siteStore.data.socialLinks" :key="item.url">
                <a :href="item.url" target="_blank" rel="noreferrer">
                  <img v-if="item.image" :src="item.image" :alt="item.label" width="28" height="28" />
                  <Icon v-else :icon="item.icon || 'solar:link-circle-linear'" class="iconify" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </figure>
    <div v-if="hero.showScrollDown" class="headertop-down faa-float animated" @click="scrollDown">
      <Icon icon="fa6-solid:chevron-down" class="iconify" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { RouterLink } from 'vue-router';
import { DEFAULT_AUTHOR_AVATAR, DEFAULT_HERO_IMAGE } from '@/constants/assets';
import { useSiteStore } from '@/stores/site';

const siteStore = useSiteStore();
const hero = computed(() => siteStore.data.theme.hero);
const heroImage = computed(
  () =>
    hero.value.backgroundImage ||
    siteStore.data.theme.author.backgroundImage ||
    siteStore.data.site.logo ||
    DEFAULT_HERO_IMAGE
);
const avatarImage = computed(
  () => siteStore.data.site.logo || siteStore.data.theme.author.avatar || DEFAULT_AUTHOR_AVATAR
);

function scrollDown() {
  window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' });
}
</script>
