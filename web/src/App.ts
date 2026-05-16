import { computed, defineComponent, onMounted } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { useRoute } from "vue-router";
import { useCmsStore } from "./stores/cms";

export default defineComponent({
  name: "App",
  components: { RouterLink, RouterView },
  setup() {
    const store = useCmsStore();
    const route = useRoute();
    const isHome = computed(() => route.path === "/");
    const year = new Date().getFullYear();

    onMounted(() => {
      document.body.classList.add("serif");
      store.bootstrap();
    });

    return { store, route, isHome, year };
  },
  template: `
    <div class="pjax"></div>

    <section id="main-container" class="container" :class="{ 'is-homepage': isHome }">
      <header class="site-header" itemscope itemtype="http://schema.org/WPHeader">
        <div class="header-inner">
          <div class="header-before">
            <div class="nav-toggle">
              <span></span><span></span><span></span>
            </div>
            <div class="site-branding">
              <h1 class="site-title">
                <RouterLink data-pjax to="/" aria-label="access the homepage of this website">
                  {{ store.site.title || 'Cool CMS' }}
                </RouterLink>
              </h1>
            </div>
          </div>
          <div class="header-content">
            <div class="lower-container">
              <div class="lower">
                <nav class="navbar">
                  <ul class="menu-root">
                    <li><RouterLink data-pjax to="/">首页</RouterLink></li>
                    <li><RouterLink data-pjax to="/admin">工作台</RouterLink></li>
                    <li><RouterLink data-pjax to="/admin/posts/new">写文章</RouterLink></li>
                    <li><RouterLink data-pjax to="/admin/taxonomy">分类标签</RouterLink></li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
          <div class="header-after">
            <div class="header-search">
              <RouterLink data-pjax to="/" aria-label="search">
                <span class="iconify" data-icon="solar:magnifer-linear"></span>
              </RouterLink>
            </div>
            <div class="header-user">
              <RouterLink data-pjax to="/admin" aria-label="content console">
                <span class="iconify" data-icon="solar:user-circle-linear"></span>
              </RouterLink>
            </div>
          </div>
        </div>
      </header>

      <main id="page" class="main site wrapper">
        <div class="column">
          <header class="header" itemscope itemtype="http://schema.org/WPHeader">
            <div v-if="isHome" class="headertop">
              <figure id="centerbg" class="centerbg">
                <img
                  class="cover-bg"
                  :src="store.site.heroImage || 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1920&q=80'"
                  alt="background picture of the home page"
                  width="1920"
                  height="1080"
                />
                <div class="focusinfo">
                  <h1 class="center-text glitch" :data-text="store.site.title || 'Cool CMS'">
                    {{ store.site.title || 'Cool CMS' }}
                  </h1>
                  <div class="header-info no-select info-desc">
                    <p class="flex-child-center">
                      <span class="iconify" data-icon="fa:quote-left"></span>
                      <span class="desc">{{ store.site.subtitle || 'Vue3 + Fastify 内容系统' }}</span>
                      <span class="iconify" data-icon="fa:quote-right"></span>
                    </p>
                  </div>
                </div>
                <div class="headertop-down faa-float animated">
                  <span class="iconify" data-icon="fa:chevron-down"></span>
                </div>
              </figure>
            </div>
          </header>
        </div>

        <div id="content" class="main-inner site-content" :class="route.name">
          <RouterView />
        </div>
      </main>
    </section>

    <section class="site-sidebar">
      <div class="sidebar-close"></div>
      <div class="sidebar-inner"></div>
    </section>

    <footer class="site-footer" role="contentinfo">
      <div class="site-info">
        <div class="footer-logo"><p></p></div>
        <div class="footer-copyright">
          <p>
            <span>Powered by <RouterLink to="/admin">Cool CMS</RouterLink></span>
            •
            <span>Vue3 + Fastify</span>
          </p>
        </div>
        <div class="footer-device">
          <p class="footer-site-time">© {{ year }} {{ store.site.title || 'Cool CMS' }}</p>
        </div>
      </div>
    </footer>

    <div class="cd-top"></div>
  `,
});
