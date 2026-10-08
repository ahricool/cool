<script setup lang="ts">
import { useCoolI18n } from '~/composables/useCoolI18n';
import { onMounted, reactive, ref } from 'vue';
import { adminConfirm } from '../feedback';
import { toast } from '~/utils/toast';
import { api, clearSession, errorText, session } from '../api';
import ViewHeader from '../components/ViewHeader.vue';
import AssetPicker from '../components/AssetPicker.vue';
const { t } = useCoolI18n();
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
  if (!profile.displayName.trim()) {
    error.value = '请输入显示名称';
    return;
  }
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
    await useSiteStore().load(true);
    toast.success(t('账户信息已更新'));
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
async function changePassword() {
  if (busy.value) return;
  if (!password.currentPassword) {
    error.value = '请输入当前密码';
    return;
  }
  if (Array.from(password.newPassword).length < 6) {
    error.value = '密码至少需要 6 个字符';
    return;
  }
  error.value = '';
  busy.value = true;
  try {
    await api('/admin/auth/password', {
      method: 'PUT',
      body: JSON.stringify(password),
    });
    toast.success(t('密码已更新，请重新登录'));
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
      await adminConfirm(
        t('所有设备（包括当前设备）都需要重新登录。'),
        t('退出所有设备'),
        { confirmButtonText: t('退出所有设备'), cancelButtonText: t('取消') },
      );
    } catch {
      return;
    }
    await api('/admin/auth/revoke-all', { method: 'POST' });
    clearSession();
    toast.success(t('已退出所有设备'));
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <ViewHeader :title="t('我的账户')" /><el-alert
    v-if="error"
    :title="t(error)"
    type="error"
    :closable="false"
  />
  <div v-if="loaded" class="profile-grid">
    <section class="panel">
      <h2>{{ t('账户信息') }}</h2>
      <el-form label-position="top" novalidate @submit.prevent="save"
        ><el-form-item :label="t('显示名称')"
          ><el-input
            v-model="profile.displayName"
            required
            maxlength="100" /></el-form-item
        ><el-form-item :label="t('登录邮箱')"
          ><el-input
            v-model="profile.email"
            type="email"
            readonly /></el-form-item
        ><el-form-item :label="t('账户头像')"
          ><AssetPicker avatar v-model="profile.avatarUrl" /></el-form-item
        ><el-button type="primary" native-type="submit" :loading="busy">{{
          t('保存账户信息')
        }}</el-button></el-form
      >
    </section>
    <section class="panel">
      <h2>{{ t('登录与安全') }}</h2>
      <el-button :loading="busy" @click="revokeAll">{{
        t('退出所有设备')
      }}</el-button>
      <h3>{{ t('修改密码') }}</h3>
      <p class="muted">{{ t('修改密码后，需要在所有设备上重新登录。') }}</p>
      <el-form label-position="top" novalidate @submit.prevent="changePassword"
        ><el-form-item :label="t('当前密码')"
          ><el-input
            v-model="password.currentPassword"
            type="password"
            show-password
            autocomplete="current-password"
            required /></el-form-item
        ><el-form-item :label="t('新密码')"
          ><el-input
            v-model="password.newPassword"
            type="password"
            show-password
            autocomplete="new-password"
            minlength="6"
            required
          /><small class="muted">{{ t('至少 6 个字符') }}</small></el-form-item
        ><el-button native-type="submit" :loading="busy">{{
          t('更新密码')
        }}</el-button></el-form
      >
    </section>
  </div>
</template>
