<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Album, AlbumItem, Media } from '@cool/content';
import { api, upload, errorText } from '../api';
import { toast } from '~/utils/toast';
const props = defineProps<{
  modelValue: boolean;
  disabled?: boolean;
  multiple?: boolean;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  select: [media: Media];
  group: [items: AlbumItem[], layout: 'vertical' | 'grid'];
  'busy-change': [value: boolean];
  closed: [];
}>();
const { t, locale } = useCoolI18n();
const albums = ref<Album[]>([]);
const albumId = ref('');
const chosen = ref<AlbumItem[]>([]);
const layout = ref<'vertical' | 'grid'>('vertical');
const busy = ref(false);
const loading = ref(false);
const error = ref('');
const fileInput = ref<HTMLInputElement>();
const items = computed(() =>
  (albums.value.find((a) => a.id === albumId.value)?.items ?? []).filter(
    (i) => props.multiple || i.mimeType.startsWith('image/'),
  ),
);
let request = 0;
async function load() {
  const current = ++request;
  loading.value = true;
  try {
    const data = await api<Album[]>('/admin/albums');
    if (current !== request || !props.modelValue) return;
    albums.value = data;
    if (!data.some((a) => a.id === albumId.value))
      albumId.value = data[0]?.id ?? '';
    error.value = '';
  } catch (e) {
    if (current === request) error.value = errorText(e);
  } finally {
    if (current === request) loading.value = false;
  }
}
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      chosen.value = [];
      layout.value = 'vertical';
      void load();
    } else {
      request++;
      loading.value = false;
    }
  },
);
function select(item: AlbumItem) {
  if (busy.value || props.disabled) return;
  if (props.multiple) {
    const index = chosen.value.findIndex((i) => i.id === item.id);
    if (index < 0) chosen.value.push(item);
    else chosen.value.splice(index, 1);
  } else {
    emit('select', {
      id: item.mediaId ?? item.id,
      url: item.url,
      mimeType: item.mimeType,
      originalName: item.name,
      key: '',
      size: 0,
      width: 0,
      height: 0,
      createdAt: '',
    });
    emit('update:modelValue', false);
  }
}
async function fileChanged(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || busy.value || props.disabled) return;
  busy.value = true;
  emit('busy-change', true);
  try {
    for (const file of input.files)
      await upload(file, albumId.value || undefined);
    await load();
  } catch (e) {
    toast.error(errorText(e));
  } finally {
    input.value = '';
    busy.value = false;
    emit('busy-change', false);
  }
}
function confirm() {
  if (!chosen.value.length || busy.value || props.disabled) return;
  emit('group', chosen.value, layout.value);
  emit('update:modelValue', false);
}
</script>
<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('从相册选择')"
    width="min(760px,92vw)"
    append-to-body
    :close-on-click-modal="!busy"
    :close-on-press-escape="!busy"
    :show-close="!busy"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="emit('closed')"
  >
    <div class="picker-controls">
      <el-select v-model="albumId" :disabled="busy" :aria-label="t('相册')"
        ><el-option
          v-for="a in albums"
          :key="a.id"
          :value="a.id"
          :label="locale === 'en' && a.nameEn ? a.nameEn : a.name" /></el-select
      ><el-button :disabled="busy || disabled" @click="fileInput?.click()">{{
        busy ? t('上传中…') : t('上传素材')
      }}</el-button
      ><input
        ref="fileInput"
        hidden
        type="file"
        :multiple="multiple"
        :accept="
          multiple
            ? 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm'
            : 'image/jpeg,image/png,image/webp,image/gif'
        "
        @change="fileChanged"
      />
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-loading="loading" class="media-picker-grid">
      <button
        v-for="item in items"
        :key="item.id"
        :aria-pressed="chosen.some((i) => i.id === item.id)"
        :disabled="busy || disabled || loading"
        @click="select(item)"
      >
        <img
          v-if="item.mimeType.startsWith('image/')"
          :src="item.url"
          alt=""
        /><span v-else class="picker-icon" aria-hidden="true">{{
          item.mimeType.startsWith('video/') ? '▶' : '♫'
        }}</span
        ><span>{{ item.name }}</span
        ><small v-if="chosen.some((i) => i.id === item.id)">{{
          chosen.findIndex((i) => i.id === item.id) + 1
        }}</small>
      </button>
    </div>
    <el-empty
      v-if="!loading && !error && !items.length"
      :description="t('相册还是空的')"
    />
    <template #footer
      ><div v-if="multiple" class="picker-controls">
        <el-radio-group v-model="layout" :aria-label="t('排列')"
          ><el-radio-button value="vertical">{{ t('纵向') }}</el-radio-button
          ><el-radio-button value="grid">{{
            t('网格')
          }}</el-radio-button></el-radio-group
        ><el-button
          :disabled="busy"
          @click="emit('update:modelValue', false)"
          >{{ t('取消') }}</el-button
        ><el-button
          type="primary"
          :disabled="!chosen.length || busy || disabled"
          @click="confirm"
          >{{ t('插入') }} ({{ chosen.length }})</el-button
        >
      </div></template
    >
  </el-dialog>
</template>
<style scoped>
.picker-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.media-picker-grid button {
  position: relative;
}
.media-picker-grid button[aria-pressed='true'] {
  box-shadow: 0 0 0 2px var(--el-color-primary);
}
.media-picker-grid small {
  position: absolute;
  top: 8px;
  right: 8px;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: white;
  min-width: 24px;
  padding: 4px;
}
.picker-icon {
  display: grid;
  place-items: center;
  height: 120px;
  font-size: 38px;
  background: var(--el-fill-color-light);
}
</style>
