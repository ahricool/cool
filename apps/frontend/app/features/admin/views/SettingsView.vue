<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  defaultSite,
  defaultHomepage,
  type AdminSettings,
} from '@cool/content';
import { useCoolI18n } from '~/composables/useCoolI18n';
import type { CoolLocale } from '~/i18n/locale';
import { api, errorText } from '../api';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
import AssetPicker from '../components/AssetPicker.vue';

const { t } = useCoolI18n();
const contentLocale = ref<CoolLocale>('en');
const locales: CoolLocale[] = ['en', 'zh'];
const blankSiteTranslation = (locale: CoolLocale) => ({
  locale,
  title: '',
  description: '',
  authorBio: '',
});
const blankHomepageTranslation = (locale: CoolLocale) => ({
  locale,
  greeting: '',
  description: '',
  notice: '',
});
const blankSocialTranslation = (locale: CoolLocale) => ({ locale, label: '' });
const form = reactive<AdminSettings>({
  site: {
    authorName: defaultSite.authorName,
    avatarUrl: defaultSite.avatarUrl,
    commentsEnabled: defaultSite.commentsEnabled,
    translations: locales.map(blankSiteTranslation),
  },
  homepage: {
    coverUrl: defaultHomepage.coverUrl,
    focusMode: defaultHomepage.focusMode,
    wave: defaultHomepage.wave,
    translations: locales.map(blankHomepageTranslation),
  },
  social: [],
});
// Both drafts live in the form. Changing the interface language never changes
// the selected content language or writes into an authored field.
const siteTranslation = computed(() =>
  form.site.translations.find((entry) => entry.locale === contentLocale.value)!,
);
const homepageTranslation = computed(() =>
  form.homepage.translations.find(
    (entry) => entry.locale === contentLocale.value,
  )!,
);
const socialTranslations = computed(() =>
  form.social.map((link) =>
    link.translations.find((entry) => entry.locale === contentLocale.value)!,
  ),
);
const error = ref('');
const busy = ref(false);
const loaded = ref(false);
const tab = ref('site');
async function load() {
  try {
    error.value = '';
    const data = await api<AdminSettings>('/admin/settings');
    form.site = {
      ...data.site,
      translations: locales.map((locale) => ({
        ...blankSiteTranslation(locale),
        ...data.site.translations.find((entry) => entry.locale === locale),
      })),
    };
    form.homepage = {
      ...data.homepage,
      translations: locales.map((locale) => ({
        ...blankHomepageTranslation(locale),
        ...data.homepage.translations.find((entry) => entry.locale === locale),
      })),
    };
    form.social = data.social.map((link) => ({
      ...link,
      translations: locales.map((locale) => ({
        ...blankSocialTranslation(locale),
        ...link.translations.find((entry) => entry.locale === locale),
      })),
    }));
    if (!loaded.value) {
      contentLocale.value = data.site.translations.some(
        (entry) => entry.locale === 'en' && entry.title.trim(),
      )
        ? 'en'
        : 'zh';
    }
    loaded.value = true;
  } catch (e) {
    error.value = errorText(e);
  }
}
async function save() {
  if (busy.value || !loaded.value) return;
  busy.value = true;
  error.value = '';
  try {
    // Empty editor placeholders are not authored translations. Keep every
    // partially or fully authored row, including the currently hidden locale.
    const payload: AdminSettings = {
      site: {
        ...form.site,
        translations: form.site.translations.filter(
          (entry) =>
            entry.title.trim() ||
            entry.description.trim() ||
            entry.authorBio.trim(),
        ),
      },
      homepage: {
        ...form.homepage,
        translations: form.homepage.translations.filter(
          (entry) =>
            entry.greeting.trim() ||
            entry.description.trim() ||
            entry.notice.trim(),
        ),
      },
      social: form.social.map((link) => ({
        ...link,
        translations: link.translations.filter((entry) => entry.label.trim()),
      })),
    };
    const invalidSite = payload.site.translations.find(
      (entry) => !entry.title.trim(),
    );
    if (!payload.site.translations.length || invalidSite) {
      tab.value = 'site';
      if (invalidSite) contentLocale.value = invalidSite.locale;
      error.value = '请为已填写的内容语言设置网站标题，至少填写一种语言。';
      return;
    }
    const invalidHomepage = payload.homepage.translations.find(
      (entry) => !entry.greeting.trim(),
    );
    if (!payload.homepage.translations.length || invalidHomepage) {
      tab.value = 'homepage';
      if (invalidHomepage) contentLocale.value = invalidHomepage.locale;
      error.value = '请为已填写的内容语言设置首屏文字，至少填写一种语言。';
      return;
    }
    if (payload.social.some((link) => !link.translations.length)) {
      tab.value = 'social';
      error.value = '每个社交链接至少需要一种语言的名称。';
      return;
    }
    await api('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    ElMessage.success(t('配置已保存'));
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
function addSocialLink() {
  form.social.push({
    url: '',
    translations: locales.map(blankSocialTranslation),
  });
}
onMounted(load);
</script>
<template>
  <ViewHeader
    :title="t('网站配置')"
    :description="t('让这个小小世界，更像你。')"
  >
    <el-button
      type="primary"
      :disabled="!loaded"
      :loading="busy"
      @click="save"
      >{{ t('保存配置') }}</el-button
    >
  </ViewHeader>
  <ErrorNotice :error="error" @retry="loaded ? save() : load()" />
  <section v-if="loaded" class="panel settings-panel">
    <div class="content-language-picker">
      <span id="settings-content-language-label">{{ t('内容语言') }}</span>
      <el-radio-group
        v-model="contentLocale"
        aria-labelledby="settings-content-language-label"
        data-testid="settings-content-language"
      >
        <el-radio-button value="en">English</el-radio-button>
        <el-radio-button value="zh">简体中文</el-radio-button>
      </el-radio-group>
    </div>
    <p class="muted content-language-note">
      {{
        t(
          '分别编写中英文内容，切换界面语言不会更改这里的内容。保存时会保留两种语言。',
        )
      }}
    </p>
    <el-tabs v-model="tab">
      <el-tab-pane :label="t('基本信息')" name="site">
        <el-form label-position="top">
          <el-form-item :label="t('网站标题')"
            ><el-input
              :lang="contentLocale === 'zh' ? 'zh-CN' : 'en'"
              v-model="siteTranslation.title"
              maxlength="80"
              data-testid="settings-site-title"
          /></el-form-item>
          <el-form-item :label="t('网站描述')"
            ><el-input
              :lang="contentLocale === 'zh' ? 'zh-CN' : 'en'"
              v-model="siteTranslation.description"
              type="textarea"
              maxlength="300"
          /></el-form-item>
          <el-form-item :label="t('作者简介')"
            ><el-input
              :lang="contentLocale === 'zh' ? 'zh-CN' : 'en'"
              v-model="siteTranslation.authorBio"
              type="textarea"
              maxlength="500"
          /></el-form-item>
          <h3>{{ t('共用设置') }}</h3>
          <p class="muted">{{ t('以下设置对两种语言都生效。') }}</p>
          <el-form-item :label="t('作者名称')"
            ><el-input v-model="form.site.authorName" maxlength="100"
          /></el-form-item>
          <el-form-item :label="t('头像')"
            ><AssetPicker v-model="form.site.avatarUrl"
          /></el-form-item>
          <el-form-item :label="t('允许访客评论')"
            ><el-switch v-model="form.site.commentsEnabled"
          /></el-form-item>
        </el-form>
      </el-tab-pane>
      <el-tab-pane :label="t('Cool 首页')" name="homepage">
        <el-form label-position="top">
          <el-form-item :label="t('首屏文字')"
            ><el-input
              :lang="contentLocale === 'zh' ? 'zh-CN' : 'en'"
              v-model="homepageTranslation.greeting"
              maxlength="80"
          /></el-form-item>
          <el-form-item :label="t('一句话介绍')"
            ><el-input
              :lang="contentLocale === 'zh' ? 'zh-CN' : 'en'"
              v-model="homepageTranslation.description"
              maxlength="200"
          /></el-form-item>
          <el-form-item :label="t('首页公告')"
            ><el-input
              :lang="contentLocale === 'zh' ? 'zh-CN' : 'en'"
              v-model="homepageTranslation.notice"
              type="textarea"
              maxlength="300"
          /></el-form-item>
          <h3>{{ t('共用设置') }}</h3>
          <p class="muted">{{ t('以下设置对两种语言都生效。') }}</p>
          <el-form-item :label="t('首页背景')"
            ><AssetPicker
              :model-value="form.homepage.coverUrl"
              @update:model-value="
                form.homepage.coverUrl = $event ?? defaultHomepage.coverUrl
              "
          /></el-form-item>
          <el-form-item :label="t('首屏展示')">
            <el-radio-group v-model="form.homepage.focusMode">
              <el-radio-button value="glitch-text">{{
                t('标题文字')
              }}</el-radio-button>
              <el-radio-button value="avatar">{{ t('头像') }}</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item :label="t('波浪动画')"
            ><el-switch v-model="form.homepage.wave"
          /></el-form-item>
        </el-form>
      </el-tab-pane>
      <el-tab-pane :label="t('社交链接')" name="social">
        <p class="muted">{{ t('链接在首页首屏显示，最多 10 项。') }}</p>
        <p class="muted">
          {{ t('链接名称按语言分别填写，网址在两种语言中共用。') }}
        </p>
        <div
          v-for="(link, index) in form.social"
          :key="index"
          class="social-row"
        >
          <el-input
            :lang="contentLocale === 'zh' ? 'zh-CN' : 'en'"
            v-model="socialTranslations[index]!.label"
            :placeholder="t('名称')"
            :aria-label="t('链接 {index} 名称', { index: index + 1 })"
          />
          <el-input
            v-model="link.url"
            placeholder="https://"
            :aria-label="t('链接 {index} 网址', { index: index + 1 })"
          />
          <el-button text type="danger" @click="form.social.splice(index, 1)">{{
            t('移除')
          }}</el-button>
        </div>
        <el-button
          :disabled="form.social.length >= 10"
          @click="addSocialLink"
          >{{ t('＋ 添加链接') }}</el-button
        >
      </el-tab-pane>
    </el-tabs>
  </section>
</template>
<style scoped>
.content-language-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.content-language-picker > span {
  font-weight: 600;
}
.content-language-note {
  margin: 12px 0 24px;
  line-height: 1.7;
}
</style>
