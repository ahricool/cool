<script setup lang="ts">
import { socialIcon } from '~/utils/social-icon';
const store = useSiteStore();
function scrollDown() {
  document.getElementById('content')?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  });
}
</script>
<template>
  <div class="headertop">
    <figure id="centerbg" class="centerbg">
      <picture
        ><img
          class="cover-bg"
          :src="store.homepage.coverUrl"
          alt="首页背景"
          width="1920"
          height="1080"
          fetchpriority="high"
      /></picture>
      <div class="focusinfo">
        <div
          v-if="store.homepage.focusMode === 'avatar'"
          class="header-tou no-select"
        >
          <NuxtLink to="/"
            ><img
              :src="
                store.site.avatarUrl || '/sakura/images/default/avatar.webp'
              "
              :alt="store.site.authorName"
              width="120"
              height="120"
          /></NuxtLink>
        </div>
        <h1
          v-else
          class="center-text glitch"
          :data-text="store.homepage.greeting"
        >
          {{ store.homepage.greeting }}
        </h1>
        <div class="header-info no-select">
          <p class="flex-child-center">
            <span aria-hidden="true">❝</span
            ><span class="desc">{{ store.homepage.description }}</span
            ><span aria-hidden="true">❞</span>
          </p>
          <div v-if="store.social.length" class="top-social">
            <ul>
              <li v-for="link in store.social" :key="link.url">
                <a
                  :href="link.url"
                  :aria-label="link.label"
                  :title="link.label"
                  target="_blank"
                  rel="noopener noreferrer"
                  ><img
                    :src="socialIcon(link.url)"
                    alt=""
                    width="28"
                    height="28"
                /></a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </figure>
    <div v-if="store.homepage.wave" class="home-wave">
      <div
        class="wave-1"
        style="background: url('/sakura/images/wave/wave1.png') repeat-x"
      ></div>
      <div
        class="wave-2"
        style="background: url('/sakura/images/wave/wave2.png') repeat-x"
      ></div>
    </div>
    <button class="headertop-down" aria-label="浏览文章" @click="scrollDown">
      <SakuraIcon name="alt-arrow-down-linear" />
    </button>
  </div>
</template>
