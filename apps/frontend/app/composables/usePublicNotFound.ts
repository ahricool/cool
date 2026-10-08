import { watch, type Ref } from 'vue';

/** Missing content is a real Nuxt 404; transient API failures retain local retry UI. */
export function usePublicNotFound(error: Ref<unknown>) {
  watch(
    error,
    (cause) => {
      if (
        cause &&
        typeof cause === 'object' &&
        'statusCode' in cause &&
        cause.statusCode === 404
      ) {
        showError(
          createError({
            statusCode: 404,
            statusMessage: 'Page not found',
            fatal: true,
          }),
        );
      }
    },
    { immediate: true },
  );
}
