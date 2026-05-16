import { defineComponent, type PropType } from "vue";
import { RouterLink } from "vue-router";
import type { Post } from "../api/types";

export default defineComponent({
  name: "PostCard",
  components: { RouterLink },
  props: {
    post: {
      type: Object as PropType<Post>,
      required: true,
    },
  },
  template: `
    <article class="post post-list-thumb" itemscope itemtype="http://schema.org/Article">
      <div class="post-content-wrap">
        <div class="post-date flex-child-center">
          <span class="iconify" data-icon="solar:clock-circle-linear"></span>
          <span>
            <a data-pjax href="javascript:void(0)" aria-label="viewing the author the article belongs to">
              {{ post.author?.name || 'CMS Admin' }}
            </a>
          </span>
          <time class="publish-time" :datetime="post.publishedAt || post.createdAt" itemprop="dateCreated datePublished">
            {{ new Date(post.publishedAt || post.createdAt).toLocaleDateString() }}
          </time>
        </div>
        <RouterLink data-pjax :to="'/posts/' + post.slug" class="post-title" aria-label="viewing the article details">
          <h1>{{ post.title }}</h1>
        </RouterLink>
        <div class="post-meta">
          <span class="flex-child-center">
            <span class="iconify" data-icon="solar:eye-linear"></span>
            <span>{{ post.viewCount }} 热度</span>
          </span>
          <span class="comments-number flex-child-center">
            <span class="iconify" data-icon="solar:chat-line-line-duotone"></span>
            <span>{{ post.likeCount }} 喜欢</span>
          </span>
          <span v-if="post.category" class="flex-child-center">
            <span class="iconify" data-icon="solar:folder-with-files-outline"></span>
            <a data-pjax href="javascript:void(0)" aria-label="viewing the first category the article belongs to">
              {{ post.category.name }}
            </a>
          </span>
        </div>
        <div class="float-content">
          <p>{{ post.excerpt }}</p>
          <div class="post-bottom">
            <RouterLink
              data-pjax
              :to="'/posts/' + post.slug"
              class="button-normal flex-child-center"
              aria-label="viewing the article details"
            >
              <span class="iconify" data-icon="akar-icons:more-horizontal-fill">•••</span>
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="post-thumb">
        <RouterLink data-pjax :to="'/posts/' + post.slug" :alt="post.title" aria-label="viewing the article details">
          <img
            class="lazyload"
            :src="post.coverUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'"
            alt="thumbnail of the cover of the post"
            width="430"
            height="300"
          />
        </RouterLink>
      </div>
    </article>
  `,
});
