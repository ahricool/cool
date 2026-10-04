<script setup lang="ts">
const { t } = useCoolI18n();
import { ref } from 'vue';
import { resolveCustomImage } from '~/utils/custom-image';
import { ElMessage } from 'element-plus';
import { api, upload, errorText } from '../api';
import type { Media, Pagination } from '@cool/content';
const props = defineProps<{
  modelValue: string | null | undefined;
  disabled?: boolean;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  'busy-change': [value: boolean];
}>();
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
    ElMessage.error(t(errorText(e)));
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
    ElMessage.error(t(errorText(e)));
  }
}
</script>
<template>
  <div class="asset-picker">
    <img
      v-if="resolveCustomImage(modelValue)"
      :src="resolveCustomImage(modelValue)!"
      :alt="t('所选图片')"
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
        v-if="modelValue"
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
