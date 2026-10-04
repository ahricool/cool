/** Retired bundled placeholders are defaults, not custom uploaded images. */
export function resolveCustomImage(...sources: (string | null | undefined)[]) {
  return (
    sources.find(
      (source) =>
        source &&
        source !== '/sakura/images/default/avatar.webp' &&
        source !== '/sakura/images/default/temp.webp',
    ) || null
  );
}
