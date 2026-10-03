<script setup lang="ts">
defineProps<{ inert?: boolean }>();
</script>
<template>
  <footer class="site-footer" :inert="inert">
    <div class="site-info">
      <div class="footer-logo">
        <SakuraFlower class="footer-flower" />
      </div>
      <p class="footer-wish" lang="zh-CN">
        <em>愿你的天空永远星光灿烂，<br />愿你的舞台永远明光幻彩。</em>
      </p>
      <LanguageSelector variant="text" />
    </div>
  </footer>
</template>
<style scoped>
.footer-wish {
  margin: 12px 0;
}
.footer-wish em {
  font-style: italic;
}
</style>
