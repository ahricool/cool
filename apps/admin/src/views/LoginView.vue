<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, session, errorText } from '../api';
const email = ref('');
const password = ref('');
const busy = ref(false);
const error = ref('');
const route = useRoute();
const router = useRouter();
async function login() {
  busy.value = true;
  error.value = '';
  try {
    const result = await api<{ accessToken: string }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    session.token = result.accessToken;
    session.owner = await api('/admin/auth/me');
    const next = String(route.query.next ?? '/');
    await router.replace(
      next.startsWith('/') && !next.startsWith('//') ? next : '/',
    );
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="login-page">
    <section class="login-story">
      <span class="brand-mark">❀</span>
      <p class="eyebrow">YOUR PERSONAL CORNER</p>
      <h1>让灵感，<br />慢慢生长。</h1>
      <p>记录热爱，整理思绪。<br />这里是属于你的内容空间。</p>
      <span class="login-footnote">SAKURA · PERSONAL CMS</span>
    </section>
    <section class="login-form">
      <p class="eyebrow">WELCOME BACK</p>
      <h2>欢迎回来</h2>
      <p class="muted">登录后，继续你的创作。</p>
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        show-icon
      /><el-form label-position="top" @submit.prevent="login"
        ><el-form-item label="邮箱"
          ><el-input
            v-model="email"
            type="email"
            autocomplete="username"
            placeholder="站长邮箱"
            required /></el-form-item
        ><el-form-item label="密码"
          ><el-input
            v-model="password"
            type="password"
            autocomplete="current-password"
            show-password
            placeholder="输入密码"
            required /></el-form-item
        ><el-button
          type="primary"
          native-type="submit"
          :loading="busy"
          class="login-submit"
          >登录工作空间</el-button
        ></el-form
      ><a href="/" class="muted">← 返回博客</a>
    </section>
  </main>
</template>
