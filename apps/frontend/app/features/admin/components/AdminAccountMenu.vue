<script setup lang="ts">
import PatternAvatar from '~/features/admin/visuals/PatternAvatar.vue';
import ReadingIcon from '~/features/admin/visuals/ReadingIcon.vue';
import type { AuthResult } from '../api';
import { resolveCustomImage } from '~/utils/custom-image';
const props = defineProps<{
  owner: AuthResult['user'] | null;
  loggingOut: boolean;
}>();
defineEmits<{ logout: [] }>();
const { t } = useCoolI18n();
const store = useSiteStore();
const avatar = computed(() => resolveCustomImage(props.owner?.avatarUrl));
const {
  open,
  root,
  trigger,
  menu,
  cancelClose,
  close,
  hover,
  leave,
  triggerKeydown,
  menuKeydown,
} = useAdminMenu('account');
</script>
<template>
  <div
    ref="root"
    class="account-menu"
    :class="{ 'is-open': open }"
    @pointerenter="hover"
    @pointerleave="leave"
  >
    <button
      ref="trigger"
      class="account-trigger"
      type="button"
      :aria-label="t('我的账户')"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-controls="admin-account-menu"
      @click="
        cancelClose();
        open = !open;
      "
      @keydown="triggerKeydown"
    >
      <span class="account-avatar">
        <img v-if="avatar" :src="avatar" alt="" />
        <PatternAvatar
          v-else
          :shape="store.site.appearance.avatar"
          :seed="`owner-${owner?.id ?? 'default'}`"
          :width="open ? 64 : 48"
          :height="open ? 64 : 48"
        />
      </span>
    </button>
    <Teleport to="body">
      <Transition name="account-popover">
        <div
          v-if="open"
          id="admin-account-menu"
          ref="menu"
          class="account-popover"
          role="menu"
          :aria-label="t('我的账户')"
          @keydown="menuKeydown"
          @pointerenter="cancelClose"
          @pointerleave="leave"
        >
          <p class="account-name">{{ owner?.displayName }}</p>
          <RouterLink to="/admin/settings" role="menuitem" @click="close(true)"
            ><ReadingIcon name="settings" />{{ t('网站配置') }}</RouterLink
          >
          <RouterLink to="/admin/profile" role="menuitem" @click="close(true)"
            ><ReadingIcon name="user" />{{ t('我的账户') }}</RouterLink
          >
          <button
            type="button"
            role="menuitem"
            :disabled="loggingOut"
            @click="
              close(true);
              $emit('logout');
            "
          >
            <ReadingIcon name="logout" />{{ t('退出登录') }}
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
<style scoped>
.account-menu {
  position: relative;
}
.account-menu.is-open::after {
  content: '';
  position: absolute;
  top: 100%;
  right: 0;
  width: min(260px, calc(100vw - 24px));
  height: 14px;
}
.account-trigger {
  position: relative;
  display: block;
  width: 48px;
  height: 48px;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
}
.account-avatar {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 0 2px var(--sakura-surface);
  transition:
    width 0.18s ease,
    height 0.18s ease;
}
.is-open .account-avatar {
  width: 64px;
  height: 64px;
}
.account-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.account-avatar :deep(.pattern-avatar) {
  transition:
    width 0.18s ease,
    height 0.18s ease;
}
.account-popover {
  position: fixed;
  z-index: 110;
  right: 32px;
  top: calc(var(--admin-header-height) + 2px);
  width: min(260px, calc(100vw - 24px));
  max-height: calc(100svh - var(--admin-header-height) - 88px);
  overflow-y: auto;
  padding: 12px;
  background: var(--sakura-surface);
  color: var(--sakura-text-regular);
  border: 0;
  border-radius: 14px;
  box-shadow: 0 8px 32px #0002;
  transform-origin: top right;
}
.account-popover::before {
  content: '';
  position: absolute;
  inset: -18px 0 auto;
  height: 18px;
}
.account-name {
  margin: 8px 10px 12px;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.account-popover > a,
.account-popover > button {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 10px;
  color: inherit;
  text-align: left;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  cursor: pointer;
}
.account-popover > a:hover,
.account-popover > button:hover {
  color: var(--sakura-accent-strong);
  background: var(--sakura-soft);
}
.account-popover-enter-active,
.account-popover-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.account-popover-enter-from,
.account-popover-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@media (max-width: 960px) {
  .account-popover {
    right: 16px;
  }
}
@media (max-width: 600px) {
  .account-popover {
    right: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .account-avatar,
  .account-avatar :deep(.pattern-avatar),
  .account-popover-enter-active,
  .account-popover-leave-active {
    transition: none;
  }
}
</style>
