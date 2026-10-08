<script setup lang="ts">
import ReadingBrand from '~/features/admin/visuals/ReadingBrand.vue';
import ReadingIcon from '~/features/admin/visuals/ReadingIcon.vue';
defineProps<{
  items: readonly {
    path: string;
    label: string;
    icon: InstanceType<typeof ReadingIcon>['$props']['name'];
  }[];
}>();
const { t } = useCoolI18n();
const route = useRoute();
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
} = useAdminMenu('navigation');
</script>
<template>
  <div
    ref="root"
    class="admin-navigation"
    :class="{ 'is-open': open }"
    @pointerenter="hover"
    @pointerleave="leave"
  >
    <button
      ref="trigger"
      class="admin-logo"
      type="button"
      :aria-label="t('工作空间导航')"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-controls="admin-navigation-menu"
      @click="
        cancelClose();
        open = !open;
      "
      @keydown="triggerKeydown"
    >
      <ReadingBrand placement="hero" />
    </button>
    <Teleport to="body">
      <Transition name="admin-navigation-popover">
        <nav
          v-if="open"
          id="admin-navigation-menu"
          ref="menu"
          class="admin-navigation-popover"
          role="menu"
          :aria-label="t('工作空间导航')"
          @keydown="menuKeydown"
          @pointerenter="cancelClose"
          @pointerleave="leave"
        >
          <RouterLink
            v-for="item in items"
            :key="item.path"
            :to="item.path"
            role="menuitem"
            :aria-current="
              (
                item.path === '/admin'
                  ? route.path === '/admin'
                  : route.path.startsWith(item.path)
              )
                ? 'page'
                : undefined
            "
            @click="close(true)"
            ><ReadingIcon :name="item.icon" />{{ t(item.label) }}</RouterLink
          >
        </nav>
      </Transition>
    </Teleport>
  </div>
</template>
<style scoped>
.admin-navigation {
  position: relative;
  flex-shrink: 0;
}
.admin-navigation.is-open::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 0;
  width: min(260px, calc(100vw - 24px));
  height: 20px;
}
.admin-logo {
  display: flex;
  align-items: center;
  padding: 0;
  min-height: 48px;
  background: transparent;
  border: 0;
  cursor: pointer;
}
.admin-logo :deep(.reading-brand) {
  --wordmark-width: 72px;
}
.admin-logo:focus-visible {
  outline: 2px solid var(--sakura-accent-strong);
  outline-offset: 4px;
  border-radius: 8px;
}
.admin-navigation-popover {
  position: fixed;
  top: calc(var(--admin-header-height) + 2px);
  left: 32px;
  z-index: 110;
  width: min(260px, calc(100vw - 24px));
  max-height: calc(100svh - var(--admin-header-height) - 88px);
  overflow-y: auto;
  padding: 12px;
  border: 0;
  border-radius: 14px;
  background: var(--sakura-surface);
  color: var(--sakura-text-regular);
  box-shadow: 0 8px 32px #0002;
  transform-origin: top left;
}
.admin-navigation-popover > a {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 10px;
  color: inherit;
  border-radius: 8px;
  font: inherit;
}
.admin-navigation-popover > a:hover,
.admin-navigation-popover > a[aria-current] {
  color: var(--sakura-accent-strong);
  background: var(--sakura-soft);
}
.admin-navigation-popover-enter-active,
.admin-navigation-popover-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.admin-navigation-popover-enter-from,
.admin-navigation-popover-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@media (max-width: 960px) {
  .admin-navigation-popover {
    left: 16px;
  }
}
@media (max-width: 600px) {
  .admin-navigation-popover {
    left: 8px;
  }
  .admin-logo :deep(.reading-brand) {
    --wordmark-width: 60px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .admin-navigation-popover-enter-active,
  .admin-navigation-popover-leave-active {
    transition: none;
  }
}
</style>
