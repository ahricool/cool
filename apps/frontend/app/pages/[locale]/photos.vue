<script setup lang="ts">
const { t, locale, contentLang } = useCmsI18n();
import type { Pagination, Photo } from '@cms/content';
import { masonryPositions } from '~/utils/masonry';
const route = useRoute();
const api = useApi();
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const { data, pending, error, refresh } = await useAsyncData(
  () => `photos-${locale.value}-${page.value}`,
  () =>
    api<Pagination<Photo>>('/public/photos', {
      query: { page: page.value, pageSize: 24 },
    }),
);
const dialog = ref<HTMLDialogElement>();
const selected = ref<Photo>();
const gallery = ref<HTMLElement>();
const positions = ref<ReturnType<typeof masonryPositions>>();
let observer: ResizeObserver | undefined;
let frame = 0;
let observedWidth = 0;
function layoutGallery() {
  const element = gallery.value;
  if (!element?.clientWidth) return;
  const heights = Array.from(
    element.querySelectorAll<HTMLElement>('.gallery-item'),
    (item) => item.getBoundingClientRect().height,
  );
  positions.value = masonryPositions(
    heights,
    element.clientWidth,
    window.innerWidth <= 768 ? 1 : 3,
  );
}
function scheduleLayout() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(layoutGallery);
}
onMounted(() => {
  observer = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width ?? 0;
    if (width !== observedWidth) {
      observedWidth = width;
      scheduleLayout();
    }
  });
  if (gallery.value) observer.observe(gallery.value);
  window.addEventListener('resize', scheduleLayout, { passive: true });
  scheduleLayout();
});
onBeforeUnmount(() => {
  observer?.disconnect();
  cancelAnimationFrame(frame);
  window.removeEventListener('resize', scheduleLayout);
});
watch(
  () => data.value?.items,
  async () => {
    positions.value = undefined;
    await nextTick();
    scheduleLayout();
  },
);
function open(photo: Photo) {
  selected.value = photo;
  dialog.value?.showModal();
}
</script>
<template>
  <PageFrame :title="t('图库')" content-class="photos"
    ><ApiState
      :pending="pending"
      :error="error"
      :empty="data?.total === 0"
      @retry="refresh()"
    />
    <div class="photos-container">
      <section class="photos-inner">
        <div class="masonry-container">
          <div class="photos-content fancybox-content">
            <div
              ref="gallery"
              class="gallery masonry-gallery"
              :class="{ 'is-masonry': positions }"
              :style="
                positions ? { height: `${positions.height}px` } : undefined
              "
            >
              <figure
                v-for="(photo, index) in data?.items"
                :key="photo.id"
                class="gallery-item col-3"
                :style="
                  positions?.items[index]
                    ? {
                        transform: `translate3d(${positions.items[index]!.left}px, ${positions.items[index]!.top}px, 0)`,
                      }
                    : undefined
                "
              >
                <header class="gallery-icon">
                  <button
                    :aria-label="t('查看 {title}', { title: photo.title })"
                    @click="open(photo)"
                  >
                    <img
                      :src="photo.url"
                      :alt="photo.title"
                      :lang="contentLang(photo.contentLocale)"
                      loading="lazy"
                      width="500"
                      height="500"
                      @load="scheduleLayout"
                      @error="scheduleLayout"
                    />
                  </button>
                </header>
                <figcaption class="gallery-caption">
                  <div
                    class="entry-summary"
                    :lang="contentLang(photo.contentLocale)"
                  >
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
    <dialog
      ref="dialog"
      class="photo-dialog"
      aria-labelledby="photo-dialog-title"
    >
      <button :aria-label="t('关闭图片')" @click="dialog?.close()">×</button
      ><img
        v-if="selected"
        :src="selected.url"
        :alt="selected.title"
        :lang="contentLang(selected.contentLocale)"
      />
      <p
        id="photo-dialog-title"
        :lang="
          selected ? contentLang(selected.contentLocale) : contentLang(locale)
        "
      >
        {{ selected?.title || t('查看图片') }}
      </p>
    </dialog></PageFrame
  >
</template>
