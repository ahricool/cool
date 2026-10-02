<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { api, upload, errorText } from '../api';
import type { Media, Pagination } from '@cms/content';
defineProps<{ modelValue: string | null | undefined }>();
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>();
const busy = ref(false);
const dialog = ref(false);
const items = ref<Media[]>([]);
const page = ref(1);
const total = ref(0);
async function fileChanged(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  busy.value = true;
  try {
    const media = await upload(file);
    emit('update:modelValue', media.url);
  } catch (e) {
    ElMessage.error(errorText(e));
  } finally {
    busy.value = false;
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
    ElMessage.error(errorText(e));
  }
}
</script>
<template>
  <div class="asset-picker">
    <img v-if="modelValue" :src="modelValue" alt="所选图片" />
    <div class="asset-actions">
      <label class="upload-label"
        >{{ busy ? '上传中…' : '上传图片'
        }}<input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          :disabled="busy"
          @change="fileChanged" /></label
      ><el-button text @click="browse">从媒体库选择</el-button
      ><el-button
        v-if="modelValue"
        text
        type="danger"
        @click="emit('update:modelValue', null)"
        >移除</el-button
      >
    </div>
    <small class="muted"
      >JPEG / PNG / WebP / GIF，最大 8MB；统一转为 WebP，GIF 保留首帧。</small
    >
  </div>
  <el-dialog v-model="dialog" title="选择图片" width="min(720px, 92vw)"
    ><div class="media-picker-grid">
      <button
        v-for="item in items"
        :key="item.id"
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
    <el-empty v-if="!items.length" description="媒体库还是空的" /><el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="12"
      layout="prev,pager,next"
      @current-change="browse"
  /></el-dialog>
</template>
