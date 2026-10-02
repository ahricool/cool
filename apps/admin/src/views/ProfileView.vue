<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { api, errorText, session } from '../api';
import ViewHeader from '../components/ViewHeader.vue';
import AssetPicker from '../components/AssetPicker.vue';
const profile = reactive({
  email: '',
  displayName: '',
  avatarUrl: null as string | null,
});
const password = reactive({ currentPassword: '', newPassword: '' });
const busy = ref(false);
const error = ref('');
const loaded = ref(false);
onMounted(async () => {
  try {
    const d = await api<typeof profile>('/admin/auth/me');
    profile.email = d.email;
    profile.displayName = d.displayName;
    profile.avatarUrl = d.avatarUrl;
    loaded.value = true;
  } catch (e) {
    error.value = errorText(e);
  }
});
async function save() {
  busy.value = true;
  try {
    session.owner = await api('/admin/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
    ElMessage.success('账户信息已更新');
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
async function changePassword() {
  busy.value = true;
  try {
    await api('/admin/auth/password', {
      method: 'PUT',
      body: JSON.stringify(password),
    });
    ElMessage.success('密码已更新，请重新登录');
    session.token = '';
    session.owner = null;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <ViewHeader
    title="我的账户"
    description="本站只有你一位管理员，访客无需注册。"
  /><el-alert v-if="error" :title="error" type="error" :closable="false" />
  <div v-if="loaded" class="profile-grid">
    <section class="panel">
      <h2>账户信息</h2>
      <el-form label-position="top" @submit.prevent="save"
        ><el-form-item label="显示名称"
          ><el-input
            v-model="profile.displayName"
            required
            maxlength="100" /></el-form-item
        ><el-form-item label="登录邮箱"
          ><el-input
            v-model="profile.email"
            type="email"
            required /></el-form-item
        ><el-form-item label="文章作者头像"
          ><AssetPicker v-model="profile.avatarUrl" /></el-form-item
        ><el-button type="primary" native-type="submit" :loading="busy"
          >保存账户信息</el-button
        ></el-form
      >
    </section>
    <section class="panel">
      <h2>修改密码</h2>
      <p class="muted">修改后所有已登录会话立即失效。</p>
      <el-form label-position="top" @submit.prevent="changePassword"
        ><el-form-item label="当前密码"
          ><el-input
            v-model="password.currentPassword"
            type="password"
            show-password
            autocomplete="current-password"
            required /></el-form-item
        ><el-form-item label="新密码"
          ><el-input
            v-model="password.newPassword"
            type="password"
            show-password
            autocomplete="new-password"
            minlength="16"
            maxlength="256"
            required
          /><small class="muted">至少 16 个字符</small></el-form-item
        ><el-button native-type="submit" :loading="busy"
          >更新密码</el-button
        ></el-form
      >
    </section>
  </div>
</template>
