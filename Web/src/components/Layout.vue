<template>
  <div class="pjax">
    <section id="main-container" class="container">
      <!-- Header -->
      <header class="site-header" itemscope itemtype="http://schema.org/WPHeader">
        <div class="header-inner">
          <Header />
        </div>
      </header>

      <!-- Main Content -->
      <main id="page" class="main site wrapper">
        <div class="column">
          <header class="header" itemscope itemtype="http://schema.org/WPHeader">
            <slot name="header"></slot>
          </header>
        </div>

        <div id="content" class="main-inner site-content">
          <slot></slot>
          <aside v-if="showSidebar" class="sidebar">
            <Sidebar />
          </aside>
        </div>
      </main>
    </section>

    <!-- Footer -->
    <footer class="site-footer" role="contentinfo">
      <div class="site-info">
        <Footer />
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import Header from './Header.vue';
import Footer from './Footer.vue';
import Sidebar from './Sidebar.vue';

interface Props {
  showSidebar?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showSidebar: true,
});
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.main-inner {
  display: flex;
  gap: 2rem;
  margin-top: 2rem;
}

.main-inner > :first-child {
  flex: 1;
}

.sidebar {
  width: 300px;
  flex-shrink: 0;
}

.site-footer {
  margin-top: 4rem;
  padding: 2rem 0;
  background: #f5f5f5;
  text-align: center;
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
}
</style>
