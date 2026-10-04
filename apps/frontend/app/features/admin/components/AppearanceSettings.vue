<script setup lang="ts">
import type { SiteAppearance, PatternShape } from '@cool/content';
const model = defineModel<SiteAppearance>({ required: true });
const { t } = useCoolI18n();
const shapes = [
  { value: 'heart', label: '心形' },
  { value: 'star', label: '星形' },
  { value: 'dot', label: '圆点' },
] as const;
const fields = [
  { key: 'avatar', label: '默认头像' },
  { key: 'cover', label: '文章默认封面' },
  { key: 'background', label: '页面背景' },
] as const;
</script>
<template>
  <p class="muted">
    {{ t('自定义图片优先；这些图案只用于未设置图片的内容。') }}
  </p>
  <div class="appearance-settings">
    <section
      v-for="field in fields"
      :key="field.key"
      class="appearance-setting"
    >
      <h3 :id="`appearance-${field.key}-label`">{{ t(field.label) }}</h3>
      <el-radio-group
        v-model="model[field.key]"
        :aria-labelledby="`appearance-${field.key}-label`"
        :data-testid="`appearance-${field.key}`"
      >
        <el-radio-button
          v-for="shape in shapes"
          :key="shape.value"
          :value="shape.value"
          >{{ t(shape.label) }}</el-radio-button
        >
        <el-radio-button v-if="field.key === 'background'" value="none">{{
          t('无图案')
        }}</el-radio-button>
      </el-radio-group>
      <div
        class="appearance-preview"
        :class="{ 'appearance-avatar-preview': field.key === 'avatar' }"
      >
        <PatternAvatar
          v-if="field.key === 'avatar'"
          :shape="model.avatar"
          :width="72"
          :height="72"
          :alt="t('默认头像')"
        />
        <PatternSurface
          v-else-if="model[field.key] !== 'none'"
          :shape="model[field.key] as PatternShape"
          seed="appearance-preview"
        />
      </div>
    </section>
  </div>
</template>
<style scoped>
.appearance-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 24px;
  padding: 8px 0;
}
.appearance-setting h3 {
  margin: 8px 0 16px;
}
.appearance-preview {
  margin-top: 20px;
  height: 144px;
  background: var(--sakura-surface);
  border: 1px solid var(--sakura-border);
  border-radius: 12px;
  overflow: hidden;
}
.appearance-avatar-preview {
  display: grid;
  place-items: center;
}
</style>
