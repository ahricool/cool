<script setup lang="ts">
import LanguageSelector from '~/themes/sakura/components/LanguageSelector.vue';
import SakuraFlower from '~/themes/sakura/components/SakuraFlower.vue';
defineProps<{ inert?: boolean }>();
const store = useSiteStore();
const { contentLang } = useCoolI18n();
</script>
<template>
  <footer class="site-footer" :inert="inert">
    <div class="site-info">
      <div class="footer-logo">
        <SakuraFlower spinning class="footer-flower" />
      </div>
      <p class="footer-wish" lang="zh-CN">
        <em>愿你的天空永远星光灿烂，<br />愿你的舞台永远明光幻彩。</em>
      </p>
      <LanguageSelector variant="text" />
      <p class="footer-copyright">
        ©
        <span :lang="contentLang(store.site.contentLocale)">{{
          store.site.title
        }}</span>
        <span class="footer-heart" aria-hidden="true">♥</span>
      </p>
    </div>
  </footer>
</template>
<style scoped>
.footer-heart {
  color: var(--sakura-accent);
  margin-left: 6px;
}
.footer-copyright {
  margin: 8px 0 0;
  font-size: calc(12px * var(--sakura-font-scale));
}
.footer-wish {
  margin: 12px 0;
}
.footer-wish em {
  font-style: italic;
}
</style>
