<script setup lang="ts">
const { t, contentLang, locale } = useCoolI18n();
import { computed, nextTick, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { renderMarkdown } from '@cool/content';
import { upload, errorText } from '../api';
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
const fileInput = ref<HTMLInputElement>();
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
async function image(event: Event) {
  if (busy.value || props.disabled || props.readOnly) return;
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  busy.value = true;
  emit('busy-change', true);
  try {
    const media = await upload(file);
    insert(`\n![${authoredText('图片描述')}](${media.url})\n`);
  } catch (e) {
    ElMessage.error(t(errorText(e)));
  } finally {
    busy.value = false;
    emit('busy-change', false);
    (event.target as HTMLInputElement).value = '';
  }
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
          @click="fileInput?.click()"
          >{{ busy ? t('上传中') : t('插入图片') }}</el-button
        ><input
          ref="fileInput"
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          :disabled="busy || disabled || readOnly"
          @change="image"
        />
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
    <div class="editor-status">
      {{ t('{count} 字符', { count: modelValue.length }) }}
    </div>
  </div>
</template>
