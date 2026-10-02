<script setup lang="ts">
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
      <p class="eyebrow">YOUR PERSONAL CORNER</p>
      <h1>让灵感，<br />慢慢生长。</h1>
      <p>记录热爱，整理思绪。<br />这里是属于你的内容空间。</p>
      <span class="login-footnote">SAKURA · PERSONAL CMS</span>
    </section>
    <section class="login-form">
      <p class="eyebrow">{{ firstSetup ? 'A NEW CHAPTER' : 'WELCOME BACK' }}</p>
      <h2>{{ firstSetup ? '开启你的创作空间' : '欢迎回来' }}</h2>
      <p class="muted">
        {{
          firstSetup
            ? '第一次使用，为你的唯一站长账户设置密码。'
            : '登录后，继续你的创作。'
        }}
      </p>
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        show-icon
      />
      <p v-if="checking" class="muted" role="status">正在准备工作空间…</p>
      <el-button v-else-if="!status" @click="loadStatus">重新加载</el-button>
      <el-form v-if="status" label-position="top" @submit.prevent="login">
        <el-form-item label="邮箱">
          <el-input
            :model-value="ADMIN_EMAIL"
            type="email"
            autocomplete="username"
            readonly
          />
        </el-form-item>
        <el-form-item :label="firstSetup ? '设置密码' : '密码'">
          <el-input
            v-model="password"
            type="password"
            :autocomplete="firstSetup ? 'new-password' : 'current-password'"
            show-password
            :placeholder="firstSetup ? '至少 16 个字符' : '输入密码'"
            :minlength="firstSetup ? 16 : undefined"
            maxlength="256"
            required
          />
          <small v-if="firstSetup" class="muted"
            >至少 16 个字符，可使用一句容易记住的话</small
          >
        </el-form-item>
        <el-form-item v-if="firstSetup" label="确认密码">
          <el-input
            v-model="confirmation"
            type="password"
            autocomplete="new-password"
            show-password
            placeholder="再次输入密码"
            minlength="16"
            maxlength="256"
            required
          />
        </el-form-item>
        <el-button
          type="primary"
          native-type="submit"
          :loading="busy"
          :disabled="checking"
          class="login-submit"
          >{{ firstSetup ? '设置密码并进入' : '登录工作空间' }}</el-button
        >
        <p class="muted login-session-note">
          登录状态保留 15 天，可随时在账户设置中退出所有设备。
        </p>
      </el-form>
      <NuxtLink to="/" class="muted">← 返回博客</NuxtLink>
    </section>
  </main>
</template>
