<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { api, errorText } from '../api';
import { defaultSite, defaultHomepage, type Settings } from '@cms/content';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
import AssetPicker from '../components/AssetPicker.vue';
const form = reactive<Settings>({
  site: { ...defaultSite },
  homepage: { ...defaultHomepage },
  social: [],
});
const error = ref('');
const busy = ref(false);
const loaded = ref(false);
const tab = ref('site');
async function load() {
  try {
    error.value = '';
    const d = await api<Settings>('/admin/settings');
    Object.assign(form.site, d.site);
    Object.assign(form.homepage, d.homepage);
    form.social = d.social;
    loaded.value = true;
  } catch (e) {
    error.value = errorText(e);
  }
}
async function save() {
  busy.value = true;
  error.value = '';
  try {
    await api('/admin/settings', { method: 'PUT', body: JSON.stringify(form) });
    ElMessage.success('配置已保存');
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>
<template>
  <ViewHeader title="网站配置" description="让这个小小世界，更像你。"
    ><el-button type="primary" :disabled="!loaded" :loading="busy" @click="save"
      >保存配置</el-button
    ></ViewHeader
  ><ErrorNotice :error="error" @retry="load" />
  <section v-if="loaded" class="panel settings-panel">
    <el-tabs v-model="tab"
      ><el-tab-pane label="基本信息" name="site"
        ><el-form label-position="top"
          ><el-form-item label="网站标题"
            ><el-input v-model="form.site.title" maxlength="80" /></el-form-item
          ><el-form-item label="网站描述"
            ><el-input
              v-model="form.site.description"
              type="textarea"
              maxlength="300" /></el-form-item
          ><el-form-item label="作者名称"
            ><el-input
              v-model="form.site.authorName"
              maxlength="100" /></el-form-item
          ><el-form-item label="作者简介"
            ><el-input
              v-model="form.site.authorBio"
              type="textarea"
              maxlength="500" /></el-form-item
          ><el-form-item label="头像"
            ><AssetPicker v-model="form.site.avatarUrl" /></el-form-item
          ><el-form-item label="允许访客评论"
            ><el-switch
              v-model="
                form.site.commentsEnabled
              " /></el-form-item></el-form></el-tab-pane
      ><el-tab-pane label="Sakura 首页" name="homepage"
        ><el-form label-position="top"
          ><el-form-item label="首页背景"
            ><AssetPicker
              :model-value="form.homepage.coverUrl"
              @update:model-value="
                form.homepage.coverUrl = $event ?? defaultHomepage.coverUrl
              " /></el-form-item
          ><el-form-item label="首屏展示"
            ><el-radio-group v-model="form.homepage.focusMode"
              ><el-radio-button value="glitch-text">Glitch 文字</el-radio-button
              ><el-radio-button value="avatar"
                >头像</el-radio-button
              ></el-radio-group
            ></el-form-item
          ><el-form-item label="首屏文字"
            ><el-input
              v-model="form.homepage.greeting"
              maxlength="80" /></el-form-item
          ><el-form-item label="一句话介绍"
            ><el-input
              v-model="form.homepage.description"
              maxlength="200" /></el-form-item
          ><el-form-item label="首页公告"
            ><el-input
              v-model="form.homepage.notice"
              type="textarea"
              maxlength="300" /></el-form-item
          ><el-form-item label="波浪动画"
            ><el-switch
              v-model="
                form.homepage.wave
              " /></el-form-item></el-form></el-tab-pane
      ><el-tab-pane label="社交链接" name="social"
        ><p class="muted">链接在首页首屏显示，最多 10 项。</p>
        <div
          v-for="(link, index) in form.social"
          :key="index"
          class="social-row"
        >
          <el-input
            v-model="link.label"
            placeholder="名称"
            :aria-label="`链接 ${index + 1} 名称`"
          /><el-input
            v-model="link.url"
            placeholder="https://"
            :aria-label="`链接 ${index + 1} 网址`"
          /><el-button text type="danger" @click="form.social.splice(index, 1)"
            >移除</el-button
          >
        </div>
        <el-button
          :disabled="form.social.length >= 10"
          @click="form.social.push({ label: '', url: '' })"
          >＋ 添加链接</el-button
        ></el-tab-pane
      ></el-tabs
    >
  </section>
</template>
