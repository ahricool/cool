<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Media, Pagination } from '@cool/content';
import { api, upload, errorText } from '../api';
import { toast } from '~/utils/toast';
const props = defineProps<{ modelValue: boolean; disabled?: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  select: [media: Media];
  'busy-change': [value: boolean];
  closed: [];
}>();
const { t } = useCoolI18n();
const items = ref<Media[]>([]);
const page = ref(1);
const total = ref(0);
const busy = ref(false);
const loading = ref(false);
const error = ref('');
const fileInput = ref<HTMLInputElement>();
let requestId = 0;
async function load() {
  const id = ++requestId;
  loading.value = true;
  error.value = '';
  try {
    const data = await api<Pagination<Media>>(
      `/admin/media?page=${page.value}&pageSize=12`,
    );
    if (id !== requestId || !props.modelValue) return;
    // The media API stores validated images only.
    items.value = data.items;
    total.value = data.total;
  } catch (e) {
    if (id === requestId) error.value = errorText(e);
  } finally {
    if (id === requestId) loading.value = false;
  }
}
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      page.value = 1;
      items.value = [];
      void load();
    } else {
      requestId++;
      loading.value = false;
    }
  },
);
async function fileChanged(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || busy.value || props.disabled) return;
  busy.value = true;
  emit('busy-change', true);
  try {
    await upload(file);
    page.value = 1;
    await load();
  } catch (e) {
    toast.error(t(errorText(e)));
  } finally {
    input.value = '';
    busy.value = false;
    emit('busy-change', false);
  }
}
function select(item: Media) {
  if (busy.value || props.disabled) return;
  emit('select', item);
  emit('update:modelValue', false);
}
</script>
<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('选择图片')"
    width="min(720px, 92vw)"
    append-to-body
    :close-on-click-modal="!busy"
    :close-on-press-escape="!busy"
    :show-close="!busy"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="emit('closed')"
  >
    <el-button :disabled="busy || disabled" @click="fileInput?.click()">{{
      busy ? t('上传中…') : t('上传图片')
    }}</el-button>
    <input
      ref="fileInput"
      hidden
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      :disabled="busy || disabled"
      @change="fileChanged"
    />
    <p v-if="error" class="error" role="alert">{{ t(error) }}</p>
    <div v-loading="loading" class="media-picker-grid">
      <button
        v-for="item in items"
        :key="item.id"
        :disabled="busy || disabled || loading"
        @click="select(item)"
      >
        <img :src="item.url" alt="" /><span>{{ item.originalName }}</span>
      </button>
    </div>
    <el-empty
      v-if="!loading && !error && !items.length"
      :description="t('媒体库还是空的')"
    />
    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="12"
      layout="prev,pager,next"
      :disabled="busy || loading"
      @current-change="load"
    />
  </el-dialog>
</template>
