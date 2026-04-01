<template>
  <div class="footer-logo">
    <p :style="footerStyle"></p>
  </div>
  <div class="footer-copyright">
    <p>
      <span>Powered <Icon icon="fa6-brands:vuejs" class="iconify" /> by Vue & Strapi</span>
      <span>Crafted with <Icon icon="fa6-solid:heart" class="iconify" /> from Sakura</span>
    </p>
  </div>
  <div class="footer-device">
    <p class="footer-site-time">© {{ currentYear }} {{ siteStore.data.site.title }}</p>
    <p class="footer-beian">
      <a v-if="siteStore.data.theme.footer.icp" href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">
        {{ siteStore.data.theme.footer.icp }}
      </a>
      <a v-if="siteStore.data.theme.footer.police" :href="policeUrl" style="margin-left: 8px" target="_blank" rel="noreferrer">
        {{ siteStore.data.theme.footer.police }}
      </a>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useSiteStore } from '@/stores/site';

const siteStore = useSiteStore();
const currentYear = new Date().getFullYear();
const footerStyle = computed(() => ({
  backgroundImage: `url(${siteStore.data.theme.footer.logo || '/assets/images/footer/sakura.svg'})`,
}));
const policeUrl = computed(() => `https://beian.mps.gov.cn/#/query/webSearch?code=${siteStore.data.theme.footer.policeCode || ''}`);
</script>
