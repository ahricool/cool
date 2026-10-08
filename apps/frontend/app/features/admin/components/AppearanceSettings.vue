<script setup lang="ts">
import PatternSurface from '~/features/admin/visuals/PatternSurface.vue';
import PatternAvatar from '~/features/admin/visuals/PatternAvatar.vue';
import {
  normalizeUryAppearance,
  type SiteAppearance,
  type PatternShape,
  type UryAppearance,
} from '@cool/content';
import { resolveSiteTheme, siteThemes } from '~/themes/registry';
const model = defineModel<SiteAppearance>({ required: true });
const { t } = useCoolI18n();
const settingsTab = ref('sakura');
const ury = computed(() => normalizeUryAppearance(model.value.ury));
function updateUry<K extends keyof UryAppearance>(
  key: K,
  value: UryAppearance[K],
) {
  model.value.ury = { ...ury.value, [key]: value };
}
const selectedTheme = computed(() => resolveSiteTheme(model.value.themeId));
const shapes = [
  { value: 'heart', label: '心形' },
  { value: 'star', label: '星形' },
  { value: 'dot', label: '圆点' },
] as const;
const fields = [
  { key: 'avatar', label: '默认头像' },
  { key: 'cover', label: '相册默认封面' },
  { key: 'background', label: '页面背景' },
] as const;
</script>
<template>
  <section class="appearance-setting">
    <h3 id="appearance-theme-label">{{ t('网站主题') }}</h3>
    <el-radio-group
      v-model="model.themeId"
      aria-labelledby="appearance-theme-label"
      data-testid="appearance-theme"
      class="theme-options"
    >
      <el-radio-button
        v-for="theme in siteThemes"
        :key="theme.id"
        :value="theme.id"
        >{{ t(theme.label) }}</el-radio-button
      >
    </el-radio-group>
    <p class="muted">{{ t(selectedTheme.description) }}</p>
    <p class="muted">
      {{
        t(
          '保存后应用到公共博客；管理后台保持独立，其他外观设置由各主题按需使用。',
        )
      }}
    </p>
  </section>
  <el-tabs v-model="settingsTab">
    <el-tab-pane label="sakura" name="sakura">
      <p class="muted">{{ t('以下设置属于 Sakura，切换主题不会清除。') }}</p>
      <section class="appearance-setting">
        <h3 id="appearance-font-label">{{ t('全站字体') }}</h3>
        <el-radio-group
          v-model="model.font"
          aria-labelledby="appearance-font-label"
        >
          <el-radio-button value="default">{{ t('默认字体') }}</el-radio-button>
          <el-radio-button value="bubble-candy">{{
            t('梦幻泡泡糖果')
          }}</el-radio-button>
        </el-radio-group>
        <div class="font-size-setting">
          <label id="appearance-font-size-label">{{ t('字体大小') }}</label>
          <el-slider
            v-model="model.fontSize"
            :min="80"
            :max="150"
            :step="5"
            :aria-label="t('字体大小')"
          />
          <span>{{ model.fontSize }}%</span>
          <el-button
            v-if="model.fontSize !== 100"
            text
            @click="model.fontSize = 100"
            >{{ t('恢复默认') }}</el-button
          >
        </div>
        <p
          :style="{
            fontFamily:
              model.font === 'bubble-candy'
                ? 'Bubble Candy, var(--sakura-default-font)'
                : 'var(--sakura-default-font)',
          }"
        >
          {{ t('春天的故事，慢慢写。') }} Sakura 2026
        </p>
      </section>
      <p class="muted">
        {{ t('未设置图片时使用以下图案。') }}
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
    </el-tab-pane>
    <el-tab-pane label="ury" name="ury">
      <p class="muted">
        {{ t('Ury 独立保存以下设置，不使用 Sakura 的背景、图案或首页横幅。') }}
      </p>
      <section class="appearance-setting">
        <h3 id="ury-palette-label">{{ t('默认配色') }}</h3>
        <el-radio-group
          :model-value="ury.palette"
          aria-labelledby="ury-palette-label"
          @update:model-value="
            updateUry('palette', $event as UryAppearance['palette'])
          "
        >
          <el-radio-button value="light">{{ t('浅色') }}</el-radio-button>
          <el-radio-button value="sepia">{{ t('暖纸色') }}</el-radio-button>
          <el-radio-button value="dark">{{ t('深色') }}</el-radio-button>
        </el-radio-group>
        <h3 id="ury-font-label">{{ t('正文字体') }}</h3>
        <el-radio-group
          :model-value="ury.font"
          aria-labelledby="ury-font-label"
          @update:model-value="
            updateUry('font', $event as UryAppearance['font'])
          "
        >
          <el-radio-button value="serif">{{ t('衬线') }}</el-radio-button>
          <el-radio-button value="sans">{{ t('无衬线') }}</el-radio-button>
        </el-radio-group>
        <div class="font-size-setting">
          <label>{{ t('字体大小') }}</label>
          <el-slider
            :model-value="ury.fontSize"
            :min="80"
            :max="150"
            :step="5"
            :aria-label="`Ury ${t('字体大小')}`"
            @update:model-value="updateUry('fontSize', $event as number)"
          />
          <span>{{ ury.fontSize }}%</span>
          <el-button
            v-if="ury.fontSize !== 100"
            text
            @click="updateUry('fontSize', 100)"
            >{{ t('恢复默认') }}</el-button
          >
        </div>
        <h3 id="ury-width-label">{{ t('阅读宽度') }}</h3>
        <el-radio-group
          :model-value="ury.readingWidth"
          aria-labelledby="ury-width-label"
          @update:model-value="
            updateUry('readingWidth', $event as UryAppearance['readingWidth'])
          "
        >
          <el-radio-button value="comfortable">{{ t('舒适') }}</el-radio-button>
          <el-radio-button value="wide">{{ t('宽幅') }}</el-radio-button>
        </el-radio-group>
        <p>
          <el-checkbox
            :model-value="ury.showAvatar"
            @update:model-value="updateUry('showAvatar', Boolean($event))"
            >{{ t('显示作者头像') }}</el-checkbox
          >
        </p>
        <p>
          <el-checkbox
            :model-value="ury.showCovers"
            @update:model-value="updateUry('showCovers', Boolean($event))"
            >{{ t('显示文章封面') }}</el-checkbox
          >
        </p>
      </section>
    </el-tab-pane>
  </el-tabs>
</template>
<style scoped>
.theme-options {
  flex-wrap: wrap;
  gap: 8px;
}
.theme-options :deep(.el-radio-button .el-radio-button__inner) {
  white-space: normal;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  border: 0;
  outline: none;
  border-radius: 10px;
  box-shadow: var(--sakura-button-shadow) !important;
}
.theme-options
  :deep(
    .el-radio-button__original-radio:focus-visible + .el-radio-button__inner
  ) {
  outline: 2px solid var(--sakura-accent-strong);
  outline-offset: 3px;
}
.font-size-setting {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}
.font-size-setting .el-slider {
  width: min(220px, 45vw);
}
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
  border: 0;
  box-shadow: var(--sakura-tag-shadow);
  border-radius: 12px;
  overflow: hidden;
}
.appearance-avatar-preview {
  display: grid;
  place-items: center;
}
</style>
