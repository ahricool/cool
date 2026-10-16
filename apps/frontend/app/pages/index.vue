<script setup lang="ts">
definePageMeta({ layout: false });
const host = ref<HTMLElement>();
const state = ref<'loading' | 'ready' | 'unavailable'>('loading');
const { locale } = useCoolI18n();
const english = computed(() => locale.value === 'en');
let dispose: (() => void) | undefined;
let cancelled = false;
useHead({ title: 'Sakura · Welcome' });
onMounted(async () => {
  try {
    const { mountWelcomeWorld } = await import('~/features/welcome/world');
    if (cancelled || !host.value) return;
    dispose = mountWelcomeWorld(host.value, () => {
      state.value = 'unavailable';
    });
    state.value = 'ready';
  } catch {
    if (!cancelled) state.value = 'unavailable';
  }
});
onBeforeUnmount(() => {
  cancelled = true;
  dispose?.();
});
</script>

<template>
  <main class="welcome-world" :data-state="state">
    <div class="welcome-grain" aria-hidden="true" />
    <div class="welcome-signature" aria-hidden="true">
      桜庭<span>SAKURA GARDEN</span>
    </div>
    <div
      ref="host"
      class="welcome-canvas"
      role="img"
      :aria-label="
        english
          ? 'A miniature cherry blossom shrine garden. Drag to rotate, scroll or pinch to zoom.'
          : '樱花神社微缩庭院。拖动旋转，滚轮或双指缩放。'
      "
    />
    <div v-if="state !== 'ready'" class="welcome-status" role="status">
      <span class="welcome-flower" aria-hidden="true">✿</span>
      <p>
        {{
          state === 'loading'
            ? english
              ? 'A little world is blooming…'
              : '一方庭院，正在盛开…'
            : english
              ? 'The garden is resting. Come on in.'
              : '庭院暂歇，欢迎继续入内。'
        }}
      </p>
    </div>
    <NuxtLink
      class="welcome-enter"
      to="/home"
      :prefetch="false"
      :aria-label="english ? 'Enter the site' : '进入网站'"
      >{{ english ? 'Enter' : '进入' }}
      <span class="welcome-arrow" aria-hidden="true"
    /></NuxtLink>
    <div class="welcome-caption" aria-hidden="true">
      <span>A MOMENT IN BLOOM</span><i />夢のつづき
    </div>
    <p v-if="state === 'ready'" class="welcome-hint">
      {{
        english
          ? 'Drag to explore · Scroll or pinch to zoom'
          : '拖动环绕 · 滚轮或双指缩放'
      }}
    </p>
  </main>
</template>

<style>
html[data-surface='welcome'],
html[data-surface='welcome'] body {
  margin: 0;
  background: #f4eaee;
}
</style>
<style scoped>
.welcome-world {
  position: fixed;
  inset: 0;
  overflow: hidden;
  isolation: isolate;
  color: #8d687a;
  background: radial-gradient(
    ellipse at 50% 43%,
    #fff9f7 0%,
    #f5eaf0 58%,
    #e9e1ef 100%
  );
  font-family: Georgia, 'Times New Roman', serif;
}
.welcome-canvas {
  position: absolute;
  inset: 0;
  touch-action: none;
}
.welcome-world[data-state='unavailable'] .welcome-canvas {
  visibility: hidden;
}
.welcome-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
.welcome-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.27;
  background-image: radial-gradient(#bca8b7 0.6px, transparent 0.6px);
  background-size: 6px 6px;
}
.welcome-signature {
  position: absolute;
  z-index: 1;
  top: max(35px, env(safe-area-inset-top));
  left: max(40px, env(safe-area-inset-left));
  letter-spacing: 0.28em;
  font-size: 26px;
  pointer-events: none;
}
.welcome-signature span {
  display: block;
  font:
    9px/2.8 Arial,
    sans-serif;
  letter-spacing: 0.26em;
}
.welcome-enter {
  position: absolute;
  z-index: 2;
  top: max(32px, env(safe-area-inset-top));
  right: max(40px, env(safe-area-inset-right));
  display: inline-flex;
  align-items: center;
  gap: 30px;
  min-height: 52px;
  padding: 0 25px;
  border: 1px solid #fff9;
  border-radius: 19px;
  background: #efb4cc88;
  backdrop-filter: blur(14px);
  color: #694254;
  text-decoration: none;
  font:
    15px/1.2 Arial,
    sans-serif;
  box-shadow:
    0 6px 30px #b97a9c16,
    inset 0 1px #fff9;
  transition:
    background 0.2s,
    transform 0.2s;
}
.welcome-enter:hover {
  background: #efb4ccc9;
  transform: translateY(-2px);
}
.welcome-enter:focus-visible {
  outline: 3px solid #9e567c;
  outline-offset: 5px;
}
.welcome-arrow {
  position: relative;
  width: 13px;
  height: 13px;
  border-top: 1.5px solid currentColor;
  border-right: 1.5px solid currentColor;
}
.welcome-arrow::after {
  content: '';
  position: absolute;
  top: 5px;
  right: -2px;
  width: 18px;
  height: 1.5px;
  background: currentColor;
  transform: rotate(-45deg);
}
.welcome-caption {
  position: absolute;
  left: 40px;
  bottom: max(35px, env(safe-area-inset-bottom));
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 12px;
  letter-spacing: 0.17em;
  pointer-events: none;
}
.welcome-caption span {
  font:
    9px/1.4 Arial,
    sans-serif;
  letter-spacing: 0.2em;
}
.welcome-caption i {
  width: 32px;
  height: 1px;
  background: #aa889c66;
}
.welcome-hint {
  position: absolute;
  right: 40px;
  bottom: max(25px, env(safe-area-inset-bottom));
  font:
    11px/1.5 Arial,
    sans-serif;
  letter-spacing: 0.06em;
  pointer-events: none;
  opacity: 0.8;
}
.welcome-status {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
  pointer-events: none;
}
.welcome-flower {
  font-size: 70px;
  color: #dca9bf;
}
.welcome-status p {
  font-size: 14px;
  letter-spacing: 0.08em;
}
@media (max-width: 600px) {
  .welcome-signature {
    left: max(22px, env(safe-area-inset-left));
    top: max(26px, env(safe-area-inset-top));
    font-size: 23px;
  }
  .welcome-enter {
    right: max(22px, env(safe-area-inset-right));
    top: max(24px, env(safe-area-inset-top));
    min-height: 48px;
    padding: 0 19px;
    gap: 20px;
  }
  .welcome-caption {
    left: max(22px, env(safe-area-inset-left));
    bottom: max(63px, env(safe-area-inset-bottom));
    font-size: 10px;
  }
  .welcome-hint {
    left: max(22px, env(safe-area-inset-left));
    right: auto;
    bottom: max(24px, env(safe-area-inset-bottom));
    font-size: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .welcome-enter {
    transition: none;
  }
}
</style>
