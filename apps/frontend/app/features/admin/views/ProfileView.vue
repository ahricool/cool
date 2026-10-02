<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api, clearSession, errorText, session } from '../api';
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
  if (busy.value) return;
  error.value = '';
  busy.value = true;
  try {
    session.owner = await api('/admin/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      }),
    });
    ElMessage.success('账户信息已更新');
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
async function changePassword() {
  if (busy.value) return;
  error.value = '';
  busy.value = true;
  try {
    await api('/admin/auth/password', {
      method: 'PUT',
      body: JSON.stringify(password),
    });
    ElMessage.success('密码已更新，请重新登录');
    clearSession();
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
async function revokeAll() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    try {
      await ElMessageBox.confirm(
        '所有设备（包括当前设备）都需要重新登录。',
        '退出所有设备',
        { confirmButtonText: '退出所有设备', cancelButtonText: '取消' },
      );
    } catch {
      return;
    }
    await api('/admin/auth/revoke-all', { method: 'POST' });
    clearSession();
    ElMessage.success('已退出所有设备');
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
          ><el-input v-model="profile.email" type="email" readonly /><small
            class="muted"
            >唯一站长邮箱固定，不开放注册。</small
          ></el-form-item
        ><el-form-item label="文章作者头像"
          ><AssetPicker v-model="profile.avatarUrl" /></el-form-item
        ><el-button type="primary" native-type="submit" :loading="busy"
          >保存账户信息</el-button
        ></el-form
      >
    </section>
    <section class="panel">
      <h2>登录与安全</h2>
      <p class="muted">登录状态最长保留 15 天。退出登录会立即撤销当前会话。</p>
      <el-button :loading="busy" @click="revokeAll">退出所有设备</el-button>
      <h3>修改密码</h3>
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
