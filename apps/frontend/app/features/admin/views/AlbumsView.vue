<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import type { Album, AlbumItem } from '@cool/content';
import { api, upload, errorText } from '../api';
import { toast } from '~/utils/toast';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
import AssetPicker from '../components/AssetPicker.vue';
const { t, locale } = useCoolI18n();
const store = useSiteStore();
const albums = ref<Album[]>([]);
const selected = ref('');
const album = computed(() => albums.value.find((a) => a.id === selected.value));
const error = ref('');
const busy = ref(false);
const editing = ref(false);
const editingId = ref('');
const form = reactive({
  name: '',
  nameEn: '',
  description: '',
  descriptionEn: '',
  coverUrl: null as string | null,
});
const input = ref<HTMLInputElement>();
const label = (a: Album) =>
  locale.value === 'en' && a.nameEn ? a.nameEn : a.name;
const cover = (a: Album) =>
  a.coverUrl || a.items.find((i) => i.mimeType.startsWith('image/'))?.url;
async function load() {
  try {
    error.value = '';
    albums.value = await api<Album[]>('/admin/albums');
    if (!albums.value.some((a) => a.id === selected.value))
      selected.value = albums.value[0]?.id ?? '';
  } catch (e) {
    error.value = errorText(e);
  }
}
function edit(a?: Album) {
  editingId.value = a?.id ?? '';
  Object.assign(form, {
    name: a?.name ?? '',
    nameEn: a?.nameEn ?? '',
    description: a?.description ?? '',
    descriptionEn: a?.descriptionEn ?? '',
    coverUrl: a?.coverUrl ?? null,
  });
  editing.value = true;
}
async function save() {
  if (!form.name.trim()) return;
  busy.value = true;
  try {
    const saved = await api<Album>(
      `/admin/albums${editingId.value ? '/' + editingId.value : ''}`,
      { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(form) },
    );
    selected.value = saved.id;
    editing.value = false;
    await load();
  } catch (e) {
    toast.error(errorText(e));
  } finally {
    busy.value = false;
  }
}
async function uploadFiles(event: Event) {
  const el = event.target as HTMLInputElement;
  if (!el.files || !album.value) return;
  busy.value = true;
  try {
    for (const file of el.files) await upload(file, album.value.id);
    await load();
  } catch (e) {
    toast.error(errorText(e));
    await load();
  } finally {
    busy.value = false;
    el.value = '';
  }
}
async function move(index: number, offset: number) {
  if (!album.value || busy.value) return;
  const ids = album.value.items.map((i) => i.id);
  const target = index + offset;
  if (target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  busy.value = true;
  try {
    await api(`/admin/albums/${album.value.id}/order`, {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    });
    await load();
  } catch (e) {
    toast.error(errorText(e));
  } finally {
    busy.value = false;
  }
}
async function removeAlbum() {
  if (!album.value || album.value.isDefault) return;
  try {
    await ElMessageBox.confirm(
      t('删除相册？素材文件会保留，被引用的相册不能删除。'),
      t('删除相册'),
      { confirmButtonText: t('删除'), cancelButtonText: t('取消') },
    );
  } catch {
    return;
  }
  busy.value = true;
  try {
    await api(`/admin/albums/${album.value.id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    toast.error(errorText(e));
  } finally {
    busy.value = false;
  }
}
async function removeItem(item: AlbumItem) {
  try {
    await ElMessageBox.confirm(
      t('删除素材？被引用的素材不能删除。'),
      t('删除素材'),
      { confirmButtonText: t('删除'), cancelButtonText: t('取消') },
    );
  } catch {
    return;
  }
  busy.value = true;
  try {
    await api(
      item.mediaId
        ? `/admin/media/${item.mediaId}`
        : `/admin/albums/items/${item.id}`,
      { method: 'DELETE' },
    );
    await load();
  } catch (e) {
    toast.error(errorText(e));
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>
<template>
  <ViewHeader :title="t('相册')"
    ><el-button :disabled="busy" @click="edit()">{{ t('新建相册') }}</el-button
    ><el-button
      type="primary"
      :disabled="busy || !album"
      @click="input?.click()"
      >{{ busy ? t('上传中…') : t('上传素材') }}</el-button
    ><input
      ref="input"
      type="file"
      hidden
      multiple
      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm"
      @change="uploadFiles"
  /></ViewHeader>
  <ErrorNotice :error="error" @retry="load" />
  <div class="album-list">
    <button
      v-for="a in albums"
      :key="a.id"
      :aria-pressed="selected === a.id"
      @click="selected = a.id"
    >
      <img v-if="cover(a)" :src="cover(a)" alt="" /><PatternSurface
        v-else
        :shape="store.site.appearance.cover"
        :seed="a.id"
      /><strong>{{ label(a) }}</strong
      ><small>{{ a.items.length }} {{ t('项') }}</small>
    </button>
  </div>
  <section v-if="album" class="panel album-content">
    <header>
      <h2>{{ label(album) }}</h2>
      <el-button :disabled="busy" text @click="edit(album)">{{
        t('编辑')
      }}</el-button
      ><el-button
        v-if="!album.isDefault"
        :disabled="busy"
        text
        type="danger"
        @click="removeAlbum"
        >{{ t('删除相册') }}</el-button
      >
    </header>
    <p>
      {{
        locale === 'en' && album.descriptionEn
          ? album.descriptionEn
          : album.description
      }}
    </p>
    <el-empty v-if="!album.items.length" :description="t('相册还是空的')" />
    <div class="album-assets">
      <article v-for="(item, index) in album.items" :key="item.id">
        <img
          v-if="item.mimeType.startsWith('image/')"
          :src="item.url"
          :alt="item.name"
          loading="lazy"
        /><video
          v-else-if="item.mimeType.startsWith('video/')"
          :src="item.url"
          controls
          preload="metadata"
        />
        <div v-else class="album-audio">
          <span aria-hidden="true">♫</span
          ><audio :src="item.url" controls preload="metadata" />
        </div>
        <strong>{{ item.name }}</strong>
        <footer>
          <el-button
            text
            :disabled="busy || index === 0"
            :aria-label="t('前移')"
            @click="move(index, -1)"
            >↑</el-button
          ><el-button
            text
            :disabled="busy || index === album.items.length - 1"
            :aria-label="t('后移')"
            @click="move(index, 1)"
            >↓</el-button
          ><el-button
            text
            type="danger"
            :disabled="busy"
            @click="removeItem(item)"
            >{{ t('删除') }}</el-button
          >
        </footer>
      </article>
    </div>
  </section>
  <el-dialog
    v-model="editing"
    :title="editingId ? t('编辑相册') : t('新建相册')"
    width="min(540px,92vw)"
    :close-on-click-modal="!busy"
    :show-close="!busy"
    ><el-form label-position="top"
      ><el-form-item :label="t('名称')"
        ><el-input
          v-model="form.name"
          :disabled="busy || (!!album?.isDefault && editingId === album.id)"
          maxlength="100" /></el-form-item
      ><el-form-item label="English"
        ><el-input v-model="form.nameEn" maxlength="100" /></el-form-item
      ><el-form-item :label="t('说明')"
        ><el-input
          v-model="form.description"
          type="textarea"
          maxlength="500" /></el-form-item
      ><el-form-item :label="t('英文说明')"
        ><el-input
          v-model="form.descriptionEn"
          type="textarea"
          maxlength="500" /></el-form-item
      ><el-form-item :label="t('封面')"
        ><AssetPicker v-model="form.coverUrl" :disabled="busy"
      /></el-form-item>
      <p class="muted">
        {{ t('未选择封面时，使用第一张图片；空相册使用全局默认图案。') }}
      </p></el-form
    ><template #footer
      ><el-button :disabled="busy" @click="editing = false">{{
        t('取消')
      }}</el-button
      ><el-button
        type="primary"
        :disabled="!form.name.trim()"
        :loading="busy"
        @click="save"
        >{{ t('保存') }}</el-button
      ></template
    ></el-dialog
  >
</template>
<style scoped>
.album-list {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 12px 0 24px;
}
.album-list button {
  background: var(--el-bg-color);
  color: inherit;
  flex: 0 0 160px;
  border: 0;
  border-radius: 14px;
  overflow: hidden;
  text-align: left;
  padding: 0 0 12px;
  cursor: pointer;
}
.album-list button[aria-pressed='true'] {
  box-shadow: 0 0 0 2px var(--el-color-primary);
}
.album-list img,
.album-list .pattern-surface {
  width: 160px;
  height: 95px;
  object-fit: cover;
}
.album-list strong,
.album-list small {
  display: block;
  padding: 6px 12px 0;
}
.album-content header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.album-content h2 {
  margin-right: auto;
}
.album-assets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}
.album-assets article {
  min-width: 0;
}
.album-assets img,
.album-assets video,
.album-audio {
  width: 100%;
  height: 180px;
  object-fit: contain;
  border-radius: 12px;
  background: var(--el-fill-color-light);
}
.album-assets strong {
  display: block;
  overflow-wrap: anywhere;
  margin: 10px 0;
}
.album-audio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}
.album-audio span {
  font-size: 36px;
}
.album-audio audio {
  width: 100%;
}
.album-assets footer {
  display: flex;
  gap: 8px;
}
</style>
