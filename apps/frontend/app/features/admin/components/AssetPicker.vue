<script setup lang="ts">
const { t } = useCoolI18n();
import { computed, ref } from 'vue';
import { resolveCustomImage } from '~/utils/custom-image';
import { toast } from '~/utils/toast';
import { api, upload, errorText } from '../api';
import type { Media, Pagination } from '@cool/content';
const props = defineProps<{
  modelValue: string | null | undefined;
  disabled?: boolean;
  defaultValue?: string | null;
  avatar?: boolean;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  'busy-change': [value: boolean];
}>();
const selectedImage = computed(() =>
  props.modelValue === props.defaultValue
    ? null
    : resolveCustomImage(props.modelValue),
);
const previewImage = computed(() =>
  resolveCustomImage(props.modelValue, props.defaultValue),
);
const store = useSiteStore();
const busy = ref(false);
const fileInput = ref<HTMLInputElement>();
const dialog = ref(false);
const items = ref<Media[]>([]);
const page = ref(1);
const total = ref(0);
async function fileChanged(event: Event) {
  if (busy.value || props.disabled) return;
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  busy.value = true;
  emit('busy-change', true);
  try {
    const media = await upload(file);
    emit('update:modelValue', media.url);
  } catch (e) {
    toast.error(t(errorText(e)));
  } finally {
    busy.value = false;
    emit('busy-change', false);
    (event.target as HTMLInputElement).value = '';
  }
}
async function browse() {
  dialog.value = true;
  try {
    const data = await api<Pagination<Media>>(
      `/admin/media?page=${page.value}&pageSize=12`,
    );
    items.value = data.items;
    total.value = data.total;
  } catch (e) {
    toast.error(t(errorText(e)));
  }
}
</script>
<template>
  <div class="asset-picker" :class="{ 'asset-picker--avatar': avatar }">
    <img v-if="previewImage" :src="previewImage!" :alt="t('所选图片')" />
    <PatternAvatar
      v-else-if="avatar"
      :shape="store.site.appearance.avatar"
      seed="avatar-picker"
      :width="120"
      :height="120"
      :alt="t('默认头像')"
    />
    <div class="asset-actions">
      <el-button
        class="upload-label"
        text
        :disabled="busy || disabled"
        @click="fileInput?.click()"
        >{{ busy ? t('上传中…') : t('上传图片') }}</el-button
      ><input
        ref="fileInput"
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        :disabled="busy || disabled"
        @change="fileChanged"
      />
      <el-button text :disabled="busy || disabled" @click="browse">{{
        t('从媒体库选择')
      }}</el-button
      ><el-button
        v-if="selectedImage"
        text
        type="danger"
        :disabled="busy || disabled"
        @click="emit('update:modelValue', null)"
        >{{ t('移除') }}</el-button
      >
    </div>
    <small class="muted">{{
      t('图片不超过8MB，动图将显示为静态图片。')
    }}</small>
  </div>
  <el-dialog v-model="dialog" :title="t('选择图片')" width="min(720px, 92vw)"
    ><div class="media-picker-grid">
      <button
        v-for="item in items"
        :key="item.id"
        :disabled="busy || disabled"
        @click="
          emit('update:modelValue', item.url);
          dialog = false;
        "
      >
        <img :src="item.url" :alt="item.originalName" /><span>{{
          item.originalName
        }}</span>
      </button>
    </div>
    <el-empty
      v-if="!items.length"
      :description="t('媒体库还是空的')" /><el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="12"
      layout="prev,pager,next"
      @current-change="browse"
  /></el-dialog>
</template>

<style scoped>
.asset-picker > img {
  display: block;
  width: 100%;
  max-width: 420px;
  max-height: 200px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 8px;
}
.asset-picker.asset-picker--avatar > img {
  width: min(120px, 100%);
  height: auto;
  aspect-ratio: 1;
  max-height: none;
  object-fit: contain;
  background: var(--sakura-surface);
}
.asset-picker--avatar > .pattern-avatar {
  margin-bottom: 8px;
}
</style>
