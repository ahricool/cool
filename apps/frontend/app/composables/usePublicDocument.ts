import type { Page, Post } from '@cool/content';

/** Data and HTTP semantics only; each theme owns the rendered component tree. */
export function usePublicDocument<T extends Page | Post>(
  kind: 'post' | 'page' | 'about',
) {
  const { locale } = useCoolI18n();
  const route = useRoute();
  const api = useApi();
  const slug = computed(() => String(route.params.slug ?? ''));
  // Install the watcher before the caller awaits Nuxt's thenable, while its
  // component scope is still active, so abandoning a page also stops its 404s.
  const result = useAsyncData(
    () => `${kind}-${locale.value}-${slug.value}`,
    () =>
      kind === 'about'
        ? // An unwritten or unpublished About page is just empty, not a 404.
          api<T>('/public/about').catch((cause: unknown) => {
            if (statusOf(cause) === 404) return null;
            throw cause;
          })
        : api<T>(
            `/public/${kind === 'post' ? 'posts' : 'pages'}/${encodeURIComponent(slug.value)}`,
          ),
  );
  usePublicNotFound(result.error);
  return result;
}

function statusOf(cause: unknown) {
  return cause && typeof cause === 'object' && 'statusCode' in cause
    ? cause.statusCode
    : undefined;
}
