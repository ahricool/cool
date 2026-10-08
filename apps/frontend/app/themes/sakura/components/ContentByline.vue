<script setup lang="ts">
import PatternGlyph from '~/themes/sakura/components/PatternGlyph.vue';
import type { Author } from '@cool/content';
import { resolveCustomImage } from '~/utils/custom-image';
import { createPatternTile } from '~/themes/sakura/utils/sakura-pattern';
const props = defineProps<{
  author: Pick<Author, 'displayName' | 'avatarUrl'>;
  publishedAt: string | null;
}>();
const { formatDate } = useCoolI18n();
const store = useSiteStore();
const avatarPattern = computed(() =>
  createPatternTile({
    shape: store.site.appearance.avatar,
    seed: props.author.displayName,
  }),
);
</script>
<template>
  <div class="content-byline">
    <img
      v-if="resolveCustomImage(author.avatarUrl)"
      :src="resolveCustomImage(author.avatarUrl)!"
      alt=""
      width="28"
      height="28"
      class="byline-avatar"
    />
    <span v-else class="byline-avatar byline-fallback" aria-hidden="true">
      <svg
        :width="avatarPattern.size"
        :height="avatarPattern.size"
        viewBox="0 0 24 24"
        :fill="avatarPattern.marks[0]!.color"
      >
        <PatternGlyph :shape="avatarPattern.shape" />
      </svg>
    </span>
    <span>{{ author.displayName }}</span>
    <time :datetime="publishedAt ?? undefined">{{
      formatDate(publishedAt, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    }}</time>
  </div>
</template>
<style scoped>
.content-byline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: var(--sakura-muted);
  font-size: calc(12px * var(--sakura-font-scale));
}
.byline-avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}
.byline-fallback {
  display: inline-grid;
  place-items: center;
  background: var(--sakura-page);
}
.byline-fallback svg {
  opacity: var(--sakura-pattern-opacity, 0.45);
}
time {
  margin-left: 4px;
}
</style>
