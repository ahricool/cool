import type { Ref } from 'vue';

/** Auto-load only a visible, ready cursor. Failure requires an explicit retry. */
export function useTimelineAutoload(
  sentinel: Ref<HTMLElement | undefined>,
  state: {
    pending: Ref<boolean>;
    error: Ref<unknown>;
    started: Ref<boolean>;
    nextCursor: Ref<string | null>;
    loadMore: () => Promise<void>;
  },
) {
  let observer: IntersectionObserver | undefined;
  let active = true;
  let visible = false;
  let requestedCursor: string | null = null;
  function check() {
    if (
      !active ||
      !visible ||
      !state.started.value ||
      state.pending.value ||
      state.error.value ||
      !state.nextCursor.value ||
      state.nextCursor.value === requestedCursor
    )
      return;
    const bounds = sentinel.value?.getBoundingClientRect();
    if (
      bounds &&
      bounds.top <= window.innerHeight + 400 &&
      bounds.bottom >= -400
    ) {
      requestedCursor = state.nextCursor.value;
      void state.loadMore();
    }
  }
  watch(
    state.started,
    (started) => {
      if (!started) requestedCursor = null;
    },
    { flush: 'sync' },
  );
  onMounted(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        check();
      },
      { rootMargin: '400px' },
    );
    if (sentinel.value) observer.observe(sentinel.value);
  });
  watch([state.pending, state.nextCursor, state.started], () =>
    nextTick(check),
  );
  onBeforeUnmount(() => {
    active = false;
    observer?.disconnect();
  });
}
