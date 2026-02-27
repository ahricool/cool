<template>
  <div class="footer-content">
    <div class="footer-info">
      <p>&copy; {{ currentYear }} {{ siteStore.config.title }}. All rights reserved.</p>
      <p class="footer-meta">
        Powered by <a href="https://strapi.io" target="_blank" rel="noopener">Strapi</a> |
        Theme: <a href="https://github.com/LIlGG/halo-theme-sakura" target="_blank" rel="noopener">Sakura</a>
      </p>
    </div>

    <div class="footer-links">
      <a href="#" class="social-link" title="GitHub">
        <span>GitHub</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSiteStore } from '../stores/site';

const siteStore = useSiteStore();
const currentYear = computed(() => new Date().getFullYear());
</script>

<style scoped>
.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.footer-info {
  text-align: left;
}

.footer-info p {
  margin: 0.5rem 0;
  color: #666;
  font-size: 0.875rem;
}

.footer-meta a {
  color: #FE9A9A;
  text-decoration: none;
  transition: opacity 0.3s;
}

.footer-meta a:hover {
  opacity: 0.8;
}

.footer-links {
  display: flex;
  gap: 1rem;
}

.social-link {
  display: inline-block;
  padding: 0.5rem 1rem;
  color: #666;
  text-decoration: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: all 0.3s;
}

.social-link:hover {
  color: #FE9A9A;
  border-color: #FE9A9A;
}

@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    text-align: center;
  }

  .footer-info {
    text-align: center;
  }
}
</style>
