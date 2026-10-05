import type { Timeline, TimelineItem } from '@cool/content';
/** One ordered feed; language changes invalidate both data and in-flight requests. */
export function useTimeline() {
  const { locale } = useCoolI18n();
  const api = useApi();
  const items = ref<TimelineItem[]>([]);
  const nextCursor = ref<string | null>(null);
  const pending = ref(false);
  const error = shallowRef<unknown>();
  const started = ref(false);
  let generation = 0;
  let active = true;
  async function loadMore() {
    if (pending.value || (started.value && !nextCursor.value)) return;
    const requestGeneration = generation;
    const language = locale.value;
    pending.value = true;
    error.value = undefined;
    try {
      const result = await api<Timeline>('/public/timeline', {
        query: nextCursor.value ? { cursor: nextCursor.value } : {},
      });
      if (
        !active ||
        requestGeneration !== generation ||
        language !== locale.value
      )
        return;
      const seen = new Set(
        items.value.map((item) => `${item.kind}:${item.id}`),
      );
      items.value.push(
        ...result.items.filter((item) => !seen.has(`${item.kind}:${item.id}`)),
      );
      nextCursor.value = result.nextCursor;
      started.value = true;
    } catch (cause) {
      if (active && requestGeneration === generation) error.value = cause;
    } finally {
      if (active && requestGeneration === generation) pending.value = false;
    }
  }
  function reset() {
    generation++;
    items.value = [];
    nextCursor.value = null;
    started.value = false;
    pending.value = false;
    error.value = undefined;
    void loadMore();
  }
  watch(locale, reset);
  onMounted(reset);
  onBeforeUnmount(() => {
    active = false;
    generation++;
  });
  return { items, nextCursor, pending, error, started, loadMore };
}
