<script setup lang="ts">
const { t, contentLang } = useCoolI18n();
const store = useSiteStore();
const { items, nextCursor, pending, error, started, loadMore } = useTimeline();
const sentinel = ref<HTMLElement>();
let observer: IntersectionObserver | undefined;
let visible = false;
function autoLoad() {
  const bounds = sentinel.value?.getBoundingClientRect();
  const nearby =
    bounds && bounds.top <= window.innerHeight + 400 && bounds.bottom >= -400;
  if (visible && nearby && !pending.value && !error.value && nextCursor.value)
    void loadMore();
}
onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry?.isIntersecting ?? false;
      autoLoad();
    },
    { rootMargin: '400px' },
  );
  if (sentinel.value) observer.observe(sentinel.value);
});
watch([pending, nextCursor], () => nextTick(autoLoad));
onBeforeUnmount(() => observer?.disconnect());
</script>
<template>
  <PageFrame content-class="index">
    <template #header><SakuraHero /></template>
    <div v-if="store.homepage.notice" class="notice">
      <SakuraFlower />
      <div
        class="notice-content"
        :lang="contentLang(store.homepage.contentLocale)"
      >
        {{ store.homepage.notice }}
      </div>
    </div>
    <section class="timeline" :aria-label="t('时间线')">
      <h1 class="main-title flex-child-center">
        <SakuraFlower />{{ t('时间线') }}
      </h1>
      <TimelineList :items="items" />
      <div ref="sentinel" class="timeline-status" aria-live="polite">
        <ApiState
          :pending="pending"
          :error="error"
          :empty="started && items.length === 0"
          @retry="loadMore()"
        />
        <button
          v-if="nextCursor && !pending && !error"
          type="button"
          class="button-normal"
          @click="loadMore()"
        >
          {{ t('加载更多') }}
        </button>
        <p v-else-if="started && items.length && !pending && !error">
          {{ t('已读到最后') }}
        </p>
      </div>
    </section>
  </PageFrame>
</template>
