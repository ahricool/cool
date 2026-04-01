import { createApp } from 'vue';
import { createPinia } from 'pinia';
import NProgress from 'nprogress';
import App from './App.vue';
import router from './router';
import { useSiteStore } from './stores/site';
import './css/main.css';
import './styles/app.css';

NProgress.configure({ showSpinner: false });

const pinia = createPinia();
const app = createApp(App);

router.beforeEach((_to, _from, next) => {
  NProgress.start();
  next();
});

router.afterEach(() => {
  NProgress.done();
});

async function bootstrap() {
  const siteStore = useSiteStore(pinia);
  await siteStore.bootstrap();
  app.use(pinia);
  app.use(router);
  app.mount('#app');
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap app', error);
  app.use(pinia);
  app.use(router);
  app.mount('#app');
});
