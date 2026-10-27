import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computed, effectScope, nextTick, ref } from 'vue';
import { usePublicDocument } from '../../apps/frontend/app/composables/usePublicDocument';
import { usePublicNotFound } from '../../apps/frontend/app/composables/usePublicNotFound';

test('pending document 404 handling belongs to the calling scope and stops when the page leaves', async (t) => {
  const error = ref<unknown>();
  const failures: unknown[] = [];
  const result = Object.assign(Promise.resolve({ error }), { error });
  const globals = globalThis as unknown as Record<string, unknown>;
  const mocks = {
    computed,
    useCoolI18n: () => ({ locale: ref('zh') }),
    useRoute: () => ({ params: { slug: 'pending' } }),
    useApi: () => () => Promise.resolve(),
    useAsyncData: () => result,
    usePublicNotFound,
    createError: (value: unknown) => value,
    showError: (value: unknown) => failures.push(value),
  };
  const originals = new Map(
    Object.keys(mocks).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globals, key),
    ]),
  );
  Object.assign(globals, mocks);
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globals, key, descriptor);
      else delete globals[key];
    }
  });

  const scope = effectScope();
  assert.equal(
    scope.run(() => usePublicDocument('post')),
    result,
  );
  error.value = { statusCode: 500 };
  await nextTick();
  assert.equal(failures.length, 0);
  error.value = { statusCode: 404 };
  await nextTick();
  assert.deepEqual(failures, [
    { statusCode: 404, statusMessage: 'Page not found', fatal: true },
  ]);
  scope.stop();
  error.value = { statusCode: 404 };
  await nextTick();
  assert.equal(
    failures.length,
    1,
    'an abandoned document cannot raise a new global error',
  );
});

test('an unpublished About page loads as empty while posts keep their 404', async (t) => {
  const globals = globalThis as unknown as Record<string, unknown>;
  const responses = new Map<string, () => Promise<unknown>>();
  const fetchers: Record<string, () => Promise<unknown>> = {};
  const mocks = {
    computed,
    useCoolI18n: () => ({ locale: ref('zh') }),
    useRoute: () => ({ params: { slug: 'missing' } }),
    useApi: () => (path: string) => responses.get(path)!(),
    useAsyncData: (key: () => string, fetcher: () => Promise<unknown>) => {
      fetchers[key().split('-')[0]!] = fetcher;
      return { error: ref() };
    },
    usePublicNotFound: () => {},
  };
  const originals = new Map(
    Object.keys(mocks).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globals, key),
    ]),
  );
  Object.assign(globals, mocks);
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globals, key, descriptor);
      else delete globals[key];
    }
  });
  const notFound = () => Promise.reject({ statusCode: 404 });
  responses.set('/public/about', notFound);
  responses.set('/public/posts/missing', notFound);
  usePublicDocument('about');
  usePublicDocument('post');
  assert.equal(await fetchers.about!(), null);
  await assert.rejects(fetchers.post!(), { statusCode: 404 });
  // Other failures still reach the page's retry UI.
  responses.set('/public/about', () => Promise.reject({ statusCode: 503 }));
  await assert.rejects(fetchers.about!(), { statusCode: 503 });
  responses.set('/public/about', () => Promise.resolve({ title: 'Me' }));
  assert.deepEqual(await fetchers.about!(), { title: 'Me' });
});
