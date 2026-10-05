<script setup lang="ts">
const { t, contentLang, locale } = useCoolI18n();
import { computed, nextTick, ref } from 'vue';
import {
  renderMarkdown,
  serializeMediaGroup,
  mediaGroups,
} from '@cool/content';
import type { AlbumItem } from '@cool/content';
import MediaLibraryDialog from './MediaLibraryDialog.vue';
import { translate } from '~/i18n/messages';
const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
  readOnly?: boolean;
  contentLocale?: 'zh' | 'en';
}>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
  'busy-change': [value: boolean];
}>();
const preview = ref(false);
const textarea = ref<HTMLTextAreaElement>();
const mediaOpen = ref(false);
let imageSelection = { start: 0, end: 0 };
let imageSource = '';
const busy = ref(false);
const authoredText = (source: string) =>
  translate(source, {}, props.contentLocale ?? locale.value);
const rendered = computed(() => renderMarkdown(props.modelValue));
async function insert(prefix: string, suffix = '', placeholder = '') {
  if (props.readOnly) return;
  const el = textarea.value;
  const start = el?.selectionStart ?? props.modelValue.length;
  const end = el?.selectionEnd ?? start;
  const selected = props.modelValue.slice(start, end);
  const text = prefix + (selected || placeholder) + suffix;
  emit(
    'update:modelValue',
    props.modelValue.slice(0, start) + text + props.modelValue.slice(end),
  );
  await nextTick();
  el?.focus();
  if (suffix || placeholder) {
    el?.setSelectionRange(
      start + prefix.length,
      start + prefix.length + (selected || placeholder).length,
    );
  } else {
    el?.setSelectionRange(start + text.length, start + text.length);
  }
}
function browseImages() {
  if (busy.value || props.disabled || props.readOnly) return;
  imageSelection = {
    start: textarea.value?.selectionStart ?? props.modelValue.length,
    end: textarea.value?.selectionEnd ?? props.modelValue.length,
  };
  imageSource = props.modelValue;
  mediaOpen.value = true;
}
async function selectGroup(items: AlbumItem[], layout: 'vertical' | 'grid') {
  if (props.readOnly || props.modelValue !== imageSource) return;
  const text =
    '\n' +
    serializeMediaGroup({
      layout,
      assets: items.map((i) => ({
        id: i.mediaId ?? i.id,
        url: i.url,
        name: i.name,
        mimeType: i.mimeType,
      })),
    }) +
    '\n';
  await replaceRange(imageSelection.start, imageSelection.end, text);
  imageSelection = {
    start: imageSelection.start + text.length,
    end: imageSelection.start + text.length,
  };
  imageSource = props.modelValue;
}
async function replaceRange(start: number, end: number, text: string) {
  const el = textarea.value;
  if (!el) return;
  el.focus();
  el.setSelectionRange(start, end);
  if (!document.execCommand('insertText', false, text)) {
    el.setRangeText(text, start, end, 'end');
    emit('update:modelValue', el.value);
  }
  await nextTick();
  el.setSelectionRange(start + text.length, start + text.length);
}
const groups = computed(() => mediaGroups(props.modelValue));
async function changeLayout(index: number, value: 'vertical' | 'grid') {
  if (props.readOnly || props.disabled) return;
  const item = groups.value[index];
  if (!item) return;
  await replaceRange(
    item.start,
    item.end,
    serializeMediaGroup({ ...item.group, layout: value }),
  );
}
function restoreImageFocus() {
  textarea.value?.focus();
  if (props.modelValue === imageSource)
    textarea.value?.setSelectionRange(imageSelection.start, imageSelection.end);
}
</script>
<template>
  <div class="markdown-editor">
    <div class="editor-toolbar">
      <div>
        <el-button
          text
          :aria-label="t('插入标题')"
          :disabled="readOnly"
          @click="insert('\n## ', '\n', authoredText('标题'))"
          >H₂</el-button
        ><el-button
          text
          :aria-label="t('插入加粗')"
          :disabled="readOnly"
          @click="insert('**', '**', authoredText('加粗文字'))"
          ><b>B</b></el-button
        ><el-button
          text
          :aria-label="t('插入代码块')"
          :disabled="readOnly"
          @click="insert('\n```typescript\n', '\n```\n')"
          >&lt;/&gt;</el-button
        ><el-button
          class="upload-label"
          text
          :disabled="busy || disabled || readOnly"
          @click="browseImages"
          >{{ busy ? t('上传中') : t('从相册插入') }}</el-button
        >
      </div>
      <el-button :aria-pressed="preview" @click="preview = !preview">{{
        t('预览')
      }}</el-button>
    </div>
    <div class="editor-panes" :class="{ split: preview }">
      <textarea
        ref="textarea"
        :readonly="readOnly"
        :lang="contentLocale ? contentLang(contentLocale) : undefined"
        :value="modelValue"
        :aria-label="t('正文')"
        :placeholder="t('从这里开始写作…')"
        spellcheck="false"
        @input="
          emit(
            'update:modelValue',
            ($event.target as HTMLTextAreaElement).value,
          )
        "
      ></textarea>
      <article
        v-if="preview"
        class="markdown-preview"
        :lang="contentLocale ? contentLang(contentLocale) : undefined"
        v-html="rendered.html"
      ></article>
    </div>
    <div v-if="groups.length" class="media-layout-controls">
      <label v-for="(group, index) in groups" :key="index"
        >{{ t('素材组') }} {{ index + 1 }} · {{ group.group.assets.length
        }}<select
          :value="group.group.layout"
          :disabled="readOnly || disabled"
          :aria-label="t('排列')"
          @change="
            changeLayout(
              index,
              ($event.target as HTMLSelectElement).value as 'vertical' | 'grid',
            )
          "
        >
          <option value="vertical">{{ t('纵向') }}</option>
          <option value="grid">{{ t('网格') }}</option>
        </select></label
      >
    </div>
    <div class="editor-status">
      {{ t('{count} 字符', { count: modelValue.length }) }}
    </div>
    <MediaLibraryDialog
      v-model="mediaOpen"
      :disabled="disabled || readOnly"
      multiple
      @group="selectGroup"
      @busy-change="
        busy = $event;
        emit('busy-change', $event);
      "
      @closed="restoreImageFocus"
    />
  </div>
</template>
