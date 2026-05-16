import { defineComponent, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api/client";
import type { Post } from "../api/types";

export default defineComponent({
  name: "PostView",
  setup() {
    const route = useRoute();
    const post = ref<Post | null>(null);
    const loading = ref(false);

    async function load() {
      loading.value = true;
      post.value = await api.post(String(route.params.slug));
      loading.value = false;
    }

    async function like() {
      if (!post.value) return;
      const result = await api.likePost(post.value.id);
      post.value.likeCount = result.likeCount;
    }

    onMounted(load);
    watch(() => route.params.slug, load);
    return { post, loading, like };
  },
  template: `
    <div v-if="post" id="primary" class="content-area">
      <div class="post-header">
        <div class="page-header is-decorate">
          <div class="pattern-center single-center no-select">
            <div class="pattern-attachment-img" itemscope itemtype="http://schema.org/ImageGallery">
              <img
                class="lazyload"
                :src="post.coverUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80'"
                itemprop="contentUrl"
                alt="large picture of the cover"
                width="1920"
                height="400"
              />
            </div>
          </div>
          <div class="pattern-title" itemprop="name headline">
            <h1>{{ post.title }}</h1>
            <div class="post-meta">
              <div class="meta-container flex-child-center">
                <span class="post-meta-item">{{ post.author?.name || 'CMS Admin' }}</span>
                <span class="post-meta-item">{{ new Date(post.publishedAt || post.createdAt).toLocaleString() }}</span>
                <span class="post-meta-item">{{ post.viewCount }} 阅读</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <article :id="'post-' + post.id" class="post-article" :data-owner="post.author?.name" :data-url="'/posts/' + post.slug">
        <div class="entry-content fancybox-content" itemprop="articleBody" v-html="post.content"></div>
        <footer class="post-footer">
          <div>
            <p class="flex-child-center">
              <span>Q.E.D.</span>
              <span class="iconify" data-icon="fa:meetup" style="color: #d34836"></span>
            </p>
          </div>
          <div class="post-footer-meta">
            <div class="post-tags flex-child-center">
              <span class="iconify" data-icon="system-uicons:tags" style="scale: 1.3;"></span>
              <a v-for="tag in post.tags" :key="tag.id" href="javascript:void(0)" rel="tag">{{ tag.name }}</a>
            </div>
            <button class="button-normal flex-child-center" @click="like">喜欢 {{ post.likeCount }}</button>
          </div>
        </footer>
      </article>
    </div>
    <div v-else class="sakura-vue-status">正在加载文章...</div>
  `,
});
