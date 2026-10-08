import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computed, effectScope, nextTick, ref, shallowRef, watch } from 'vue';
import { useTimelineAutoload } from '../../apps/frontend/app/composables/useTimelineAutoload';
import { useTimeline } from '../../apps/frontend/app/composables/useTimeline';
import { useReaderPalette } from '../../apps/frontend/app/composables/useReaderPalette';
import { useCoolTheme } from '../../apps/frontend/app/composables/useCoolTheme';

function install(mocks: Record<string, unknown>) {
  const target = globalThis as unknown as Record<string, unknown>;
  const originals = new Map(
    Object.keys(mocks).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(target, key),
    ]),
  );
  Object.assign(target, mocks);
  return () => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else delete target[key];
    }
  };
}

// No browser or production API: exercise the actual composable with Vue's scheduler.
test('timeline autoload guards pending/error/repeated cursors and disconnects on unmount', async (t) => {
  let mount!: () => void,
    unmount!: () => void,
    intersect!: (entries: { isIntersecting: boolean }[]) => void;
  let disconnected = false,
    calls = 0;
  const pending = ref(false),
    error = ref<unknown>(),
    started = ref(true),
    nextCursor = ref<string | null>('1');
  const sentinel = ref({
    getBoundingClientRect: () => ({ top: 850, bottom: 851 }),
  } as HTMLElement);
  class Observer {
    constructor(callback: typeof intersect) {
      intersect = callback;
    }
    observe() {
      /* synthetic element */
    }
    disconnect() {
      disconnected = true;
    }
  }
  const restore = install({
    watch,
    nextTick,
    onMounted: (fn: () => void) => {
      mount = fn;
    },
    onBeforeUnmount: (fn: () => void) => {
      unmount = fn;
    },
    IntersectionObserver: Observer,
    window: { innerHeight: 800 },
  });
  const scope = effectScope();
  t.after(() => {
    scope.stop();
    restore();
  });
  scope.run(() =>
    useTimelineAutoload(sentinel, {
      pending,
      error,
      started,
      nextCursor,
      loadMore: async () => {
        calls++;
        pending.value = true;
      },
    }),
  );
  mount();
  intersect([{ isIntersecting: true }]);
  assert.equal(calls, 1);
  intersect([{ isIntersecting: true }]);
  assert.equal(calls, 1);
  pending.value = false;
  await nextTick();
  await nextTick();
  assert.equal(calls, 1, 'same cursor must not loop');
  error.value = new Error('offline');
  nextCursor.value = '2';
  await nextTick();
  await nextTick();
  assert.equal(calls, 1);
  error.value = undefined;
  pending.value = true;
  pending.value = false;
  intersect([{ isIntersecting: true }]);
  assert.equal(calls, 2);
  pending.value = false;
  started.value = false;
  nextCursor.value = '1';
  await nextTick();
  await nextTick();
  assert.equal(calls, 2);
  started.value = true;
  await nextTick();
  await nextTick();
  assert.equal(calls, 3, 'a new language feed resets cursor guard');
  unmount();
  assert.equal(disconnected, true);
  pending.value = false;
  nextCursor.value = '3';
  await nextTick();
  await nextTick();
  intersect([{ isIntersecting: true }]);
  assert.equal(calls, 3);
});

test('timeline keeps the latest language and rejects completion after unmount', async (t) => {
  let mount!: () => void, unmount!: () => void;
  const locale = ref('zh');
  const requests: {
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }[] = [];
  const restore = install({
    ref,
    shallowRef,
    watch,
    useCoolI18n: () => ({ locale }),
    useApi: () => () =>
      new Promise((resolve, reject) => requests.push({ resolve, reject })),
    onMounted: (fn: () => void) => {
      mount = fn;
    },
    onBeforeUnmount: (fn: () => void) => {
      unmount = fn;
    },
  });
  const scope = effectScope();
  t.after(() => {
    scope.stop();
    restore();
  });
  const feed = scope.run(() => useTimeline())!;
  const result = (id: string) => ({
    items: [
      {
        kind: 'moment',
        id,
        content: id,
        author: null,
        publishedAt: null,
        contentLocale: 'en',
      },
    ],
    nextCursor: 'next',
  });
  mount();
  assert.equal(requests.length, 1);
  void feed.loadMore();
  assert.equal(requests.length, 1, 'concurrent load is ignored');
  locale.value = 'en';
  await nextTick();
  assert.equal(requests.length, 2);
  requests[1]!.resolve(result('new'));
  await nextTick();
  await nextTick();
  requests[0]!.resolve(result('old'));
  await nextTick();
  await nextTick();
  assert.deepEqual(
    feed.items.value.map((item) => item.id),
    ['new'],
  );
  const pending = feed.loadMore();
  assert.equal(requests.length, 3);
  unmount();
  requests[2]!.resolve(result('abandoned'));
  await pending;
  assert.deepEqual(
    feed.items.value.map((item) => item.id),
    ['new'],
  );
});

test('reader palette state shares a namespace but isolates Ury from public and Admin modes', async (t) => {
  const states = new Map<string, ReturnType<typeof ref>>();
  const cookies = new Map<string, ReturnType<typeof ref>>([
    ['cool_theme', ref('dark')],
    ['cool_admin_theme', ref('light')],
  ]);
  const restore = install({
    computed,
    watch,
    useReaderPalette,
    useCookie: (key: string) => {
      if (!cookies.has(key)) cookies.set(key, ref(null));
      return cookies.get(key);
    },
    useState: (key: string, initial: () => unknown) => {
      if (!states.has(key)) states.set(key, ref(initial()));
      return states.get(key);
    },
  });
  const scope = effectScope();
  t.after(() => {
    scope.stop();
    restore();
  });
  const value = scope.run(() => ({
    blog: useCoolTheme(),
    admin: useCoolTheme('admin'),
    ury: useReaderPalette('cool_ury_palette'),
    secondUry: useReaderPalette('cool_ury_palette'),
  }))!;
  assert.equal(value.blog.value, true);
  assert.equal(value.admin.value, false);
  value.ury.value = 'sepia';
  await nextTick();
  assert.equal(value.secondUry.value, 'sepia');
  assert.equal(cookies.get('cool_ury_palette')!.value, 'sepia');
  assert.equal(cookies.get('cool_theme')!.value, 'dark');
  assert.equal(cookies.get('cool_admin_theme')!.value, 'light');
  value.ury.value = null;
  await nextTick();
  assert.equal(cookies.get('cool_ury_palette')!.value, null);
  value.blog.value = false;
  await nextTick();
  assert.equal(cookies.get('cool_theme')!.value, 'light');
});
