<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { renderMarkdown } from '@cms/content';
import { upload, errorText } from '../api';
const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const preview = ref(false);
const textarea = ref<HTMLTextAreaElement>();
const busy = ref(false);
const rendered = computed(() => renderMarkdown(props.modelValue));
function insert(text: string) {
  const el = textarea.value;
  const start = el?.selectionStart ?? props.modelValue.length;
  const end = el?.selectionEnd ?? start;
  emit(
    'update:modelValue',
    props.modelValue.slice(0, start) + text + props.modelValue.slice(end),
  );
  el?.focus();
}
async function image(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  busy.value = true;
  try {
    const media = await upload(file);
    insert(`\n![图片描述](${media.url})\n`);
  } catch (e) {
    ElMessage.error(errorText(e));
  } finally {
    busy.value = false;
    (event.target as HTMLInputElement).value = '';
  }
}
</script>
<template>
  <div class="markdown-editor">
    <div class="editor-toolbar">
      <div>
        <el-button text aria-label="插入标题" @click="insert('\n## 标题\n')"
          >H₂</el-button
        ><el-button text aria-label="插入加粗" @click="insert('**加粗文字**')"
          ><b>B</b></el-button
        ><el-button
          text
          aria-label="插入代码块"
          @click="insert('\n```typescript\n\n```\n')"
          >&lt;/&gt;</el-button
        ><label class="upload-label"
          >{{ busy ? '上传中' : '插入图片'
          }}<input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            :disabled="busy"
            @change="image"
        /></label>
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
        placeholder="从这里开始写作…\n支持 Markdown、代码高亮和图片上传。"
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
