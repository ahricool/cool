<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { renderMarkdown } from '@cms/content';
import { upload, errorText } from '../api';
const props = defineProps<{ modelValue: string; disabled?: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
  'busy-change': [value: boolean];
}>();
const preview = ref(false);
const textarea = ref<HTMLTextAreaElement>();
const fileInput = ref<HTMLInputElement>();
const busy = ref(false);
const rendered = computed(() => renderMarkdown(props.modelValue));
async function insert(prefix: string, suffix = '', placeholder = '') {
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
  if (busy.value || props.disabled) return;
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  busy.value = true;
  emit('busy-change', true);
  try {
    const media = await upload(file);
    insert(`\n![图片描述](${media.url})\n`);
  } catch (e) {
    ElMessage.error(errorText(e));
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
          aria-label="插入标题"
          @click="insert('\n## ', '\n', '标题')"
          >H₂</el-button
        ><el-button
          text
          aria-label="插入加粗"
          @click="insert('**', '**', '加粗文字')"
          ><b>B</b></el-button
        ><el-button
          text
          aria-label="插入代码块"
          @click="insert('\n```typescript\n', '\n```\n')"
          >&lt;/&gt;</el-button
        ><el-button
          class="upload-label"
          text
          :disabled="busy || disabled"
          @click="fileInput?.click()"
          >{{ busy ? '上传中' : '插入图片' }}</el-button
        ><input
          ref="fileInput"
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          :disabled="busy || disabled"
          @change="image"
        />
      </div>
      <el-button :aria-pressed="preview" @click="preview = !preview"
        >预览</el-button
      >
    </div>
    <div class="editor-panes" :class="{ split: preview }">
      <textarea
        ref="textarea"
        :value="modelValue"
        aria-label="Markdown 内容"
        :placeholder="'从这里开始写作…\n支持 Markdown、代码高亮和图片上传。'"
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
        v-html="rendered.html"
      ></article>
    </div>
    <div class="editor-status">
      Markdown · {{ modelValue.length }} 字符<span>原文保存 · 安全预览</span>
    </div>
  </div>
</template>
