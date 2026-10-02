<script setup lang="ts">
import type { Pagination, Photo } from '@cms/content';
const route = useRoute();
const api = useApi();
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const { data, pending, error, refresh } = await useAsyncData(
  () => `photos-${page.value}`,
  () =>
    api<Pagination<Photo>>('/public/photos', {
      query: { page: page.value, pageSize: 24 },
    }),
);
const dialog = ref<HTMLDialogElement>();
const selected = ref<Photo>();
function open(photo: Photo) {
  selected.value = photo;
  dialog.value?.showModal();
}
</script>
<template>
  <PageFrame title="图库" content-class="photos"
    ><ApiState
      :pending="pending"
      :error="error"
      :empty="data?.total === 0"
      @retry="refresh()"
    />
    <div class="photos-container">
      <section class="photos-inner">
        <div class="masonry-container">
          <div class="photos-content">
            <div class="gallery masonry-gallery">
              <figure
                v-for="photo in data?.items"
                :key="photo.id"
                class="gallery-item col-2"
              >
                <header class="gallery-icon">
                  <button
                    :aria-label="`查看 ${photo.title}`"
                    @click="open(photo)"
                  >
                    <img
                      :src="photo.url"
                      :alt="photo.title"
                      loading="lazy"
                      width="500"
                      height="500"
                    />
                  </button>
                </header>
                <figcaption class="gallery-caption">
                  <div class="entry-summary">
                    <h3>{{ photo.title }}</h3>
                    <p>{{ photo.description }}</p>
                    <small>{{ photo.album }}</small>
                  </div>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>
    </div>
    <Pagination v-if="data" :total="data.total" :page="page" :page-size="24" />
    <dialog ref="dialog" class="photo-dialog">
      <button aria-label="关闭图片" @click="dialog?.close()">×</button
      ><img v-if="selected" :src="selected.url" :alt="selected.title" />
      <p>{{ selected?.title }}</p>
    </dialog></PageFrame
  >
</template>
