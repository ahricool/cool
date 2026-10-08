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
