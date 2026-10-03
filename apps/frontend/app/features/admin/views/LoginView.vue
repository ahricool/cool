<script setup lang="ts">
import { useCoolI18n } from '~/composables/useCoolI18n';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ADMIN_EMAIL,
  acceptSession,
  api,
  errorText,
  safeAdminNext,
  type AuthResult,
} from '../api';
const { t } = useCoolI18n();
const password = ref('');
const confirmation = ref('');
const busy = ref(false);
const error = ref('');
const status = ref<{ initialized: boolean; setupAvailable: boolean }>();
const checking = ref(false);
const firstSetup = computed(() => status.value?.initialized === false);
const route = useRoute();
const router = useRouter();
async function loadStatus() {
  if (checking.value) return;
  checking.value = true;
  error.value = '';
  try {
    status.value = await api('/admin/auth/status');
  } catch (e) {
    error.value = errorText(e);
  } finally {
    checking.value = false;
  }
}
onMounted(loadStatus);
async function login() {
  if (busy.value || !status.value) return;
  if (!password.value) {
    error.value = '请输入密码';
    return;
  }
  if (firstSetup.value && Array.from(password.value).length < 6) {
    error.value = '密码至少需要 6 个字符';
    return;
  }
  if (firstSetup.value && password.value !== confirmation.value) {
    error.value = '两次输入的密码不一致';
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    const result = await api<AuthResult>(
      firstSetup.value ? '/admin/auth/setup' : '/admin/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(
          firstSetup.value
            ? { password: password.value }
            : { email: ADMIN_EMAIL, password: password.value },
        ),
      },
    );
    acceptSession(result);
    password.value = '';
    confirmation.value = '';
    await router.replace(safeAdminNext(route.query.next));
  } catch (e) {
    const message = errorText(e);
    // If another tab completed first-time setup, reveal the ordinary login.
    if (firstSetup.value) await loadStatus();
    error.value = message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="login-page">
    <section class="login-story">
      <SakuraFlower class="brand-mark" />
      <p class="eyebrow">{{ t('你的专属天地') }}</p>
      <h1>{{ t('让灵感，') }}<br />{{ t('慢慢生长。') }}</h1>
      <p>
        {{ t('记录热爱，整理思绪。') }}<br />{{ t('这里是属于你的内容空间。') }}
      </p>
      <span class="login-footnote">梦桜 · {{ t('创作工作台') }}</span>
    </section>
    <section class="login-form">
      <p class="eyebrow">{{ t(firstSetup ? '新的篇章' : '欢迎归来') }}</p>
      <h2>{{ t(firstSetup ? '开启你的创作空间' : '欢迎回来') }}</h2>
      <p class="muted">
        {{
          t(
            firstSetup
              ? '第一次使用，为你的唯一站长账户设置密码。'
              : '登录后，继续你的创作。',
          )
        }}
      </p>
      <el-alert
        v-if="error"
        :title="t(error)"
        type="error"
        :closable="false"
        show-icon
      />
      <p v-if="checking" class="muted" role="status">
        {{ t('正在准备工作空间…') }}
      </p>
      <el-button v-else-if="!status" @click="loadStatus">{{
        t('重新加载')
      }}</el-button>
      <el-form
        v-if="status"
        label-position="top"
        novalidate
        @submit.prevent="login"
      >
        <el-form-item :label="t('邮箱')">
          <el-input
            :model-value="ADMIN_EMAIL"
            type="email"
            autocomplete="username"
            readonly
          />
        </el-form-item>
        <el-form-item :label="t(firstSetup ? '设置密码' : '密码')">
          <el-input
            v-model="password"
            type="password"
            :autocomplete="firstSetup ? 'new-password' : 'current-password'"
            show-password
            :placeholder="t(firstSetup ? '至少 6 个字符' : '输入密码')"
            :minlength="firstSetup ? 6 : undefined"
            required
          />
          <small v-if="firstSetup" class="muted">{{
            t('至少 6 个字符，可使用一句容易记住的话')
          }}</small>
        </el-form-item>
        <el-form-item v-if="firstSetup" :label="t('确认密码')">
          <el-input
            v-model="confirmation"
            type="password"
            autocomplete="new-password"
            show-password
            :placeholder="t('再次输入密码')"
            minlength="6"
            required
          />
        </el-form-item>
        <el-button
          type="primary"
          native-type="submit"
          :loading="busy"
          :disabled="checking"
          class="login-submit"
          >{{ t(firstSetup ? '设置密码并进入' : '登录工作空间') }}</el-button
        >
      </el-form>
    </section>
  </main>
</template>
