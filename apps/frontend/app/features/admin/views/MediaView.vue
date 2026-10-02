<script setup lang="ts">
const { t } = useCmsI18n();
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api, upload, errorText } from '../api';
import type { Media, Pagination } from '@cms/content';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
const items = ref<Media[]>([]);
const total = ref(0);
const page = ref(1);
const error = ref('');
const busy = ref(false);
const fileInput = ref<HTMLInputElement>();
async function load() {
  try {
    error.value = '';
    const data = await api<Pagination<Media>>(
      `/admin/media?page=${page.value}&pageSize=18`,
    );
    items.value = data.items;
    total.value = data.total;
  } catch (e) {
    error.value = errorText(e);
  }
}
async function select(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (!files) return;
  busy.value = true;
  try {
    for (const file of files) await upload(file);
    await load();
    ElMessage.success(t('上传完成'));
  } catch (e) {
    ElMessage.error(t(errorText(e)));
    await load();
  } finally {
    busy.value = false;
    (event.target as HTMLInputElement).value = '';
  }
}
async function copy(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    ElMessage.success(t('图片地址已复制'));
  } catch {
    ElMessage.error(t('无法访问剪贴板'));
  }
}
async function remove(item: Media) {
  try {
    await ElMessageBox.confirm(
      t('删除这张图片？仍被内容引用的图片不能删除。'),
      t('删除媒体'),
      {
        confirmButtonText: t('删除'),
        cancelButtonText: t('取消'),
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  try {
    await api(`/admin/media/${item.id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    ElMessage.error(t(errorText(e)));
  }
}
onMounted(load);
</script>
<template>
  <ViewHeader
    :title="t('媒体库')"
    :description="t('收藏文字之外的风景。上传图片会转换为 WebP，最大 8MB。')"
    ><el-button
      class="upload-label primary"
      type="primary"
      :disabled="busy"
      @click="fileInput?.click()"
      >{{ busy ? t('上传中…') : t('＋ 上传图片') }}</el-button
    ><input
      ref="fileInput"
      hidden
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      multiple
      :disabled="busy"
      @change="select" /></ViewHeader
  ><ErrorNotice :error="error" @retry="load" /><el-empty
    v-if="!items.length && !error"
    :description="t('还没有图片，上传第一张吧')"
  />
  <div class="media-grid">
    <article v-for="item in items" :key="item.id" class="media-card">
      <img :src="item.url" :alt="item.originalName" loading="lazy" />
      <div>
        <strong>{{ item.originalName }}</strong
        ><small
          >{{ item.width }} × {{ item.height }} ·
          {{ Math.ceil(item.size / 1024) }} KB</small
        >
        <footer>
          <el-button text @click="copy(item.url)">{{ t('复制地址') }}</el-button
          ><el-button type="danger" text @click="remove(item)">{{
            t('删除')
          }}</el-button>
        </footer>
      </div>
    </article>
  </div>
  <el-pagination
    v-model:current-page="page"
    :total="total"
    :page-size="18"
    layout="prev,pager,next"
    @current-change="load"
  />
</template>
