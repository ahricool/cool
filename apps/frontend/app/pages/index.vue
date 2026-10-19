<script setup lang="ts">
import type { WelcomeWorld } from '~/features/welcome/world';

definePageMeta({ layout: false });
const host = ref<HTMLElement>();
const state = ref<'loading' | 'ready' | 'unavailable'>('loading');
const { locale } = useCoolI18n();
const english = computed(() => locale.value === 'en');
const hour = ref(10.5);
const expanded = ref(true);
const timeValue = computed(() => {
  const minutes = Math.round((hour.value % 24) * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
let world: WelcomeWorld | undefined;
let cancelled = false;
watch(hour, (value) => world?.setHour(value));
useHead({ title: 'Hakurei Shrine' });
onMounted(async () => {
  try {
    const { mountWelcomeWorld } = await import('~/features/welcome/world');
    if (cancelled || !host.value) return;
    world = mountWelcomeWorld(host.value, () => {
      state.value = 'unavailable';
    });
    world.setHour(hour.value);
    state.value = 'ready';
  } catch {
    if (!cancelled) state.value = 'unavailable';
  }
});
onBeforeUnmount(() => {
  cancelled = true;
  world?.dispose();
});
</script>

<template>
  <main class="welcome-world" :data-state="state">
    <div
      ref="host"
      class="welcome-canvas"
      role="img"
      :aria-label="
        english
          ? 'A miniature Hakurei shrine. Drag to rotate, scroll or pinch to zoom.'
          : '博丽神社微缩庭院。拖动旋转，滚轮或双指缩放。'
      "
    />
    <div v-if="state !== 'ready'" class="welcome-status" role="status">
      <svg
        v-if="state === 'loading'"
        class="loading-orbit"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <circle cx="24" cy="24" r="17" />
        <path d="M24 7a17 17 0 0 1 17 17" />
      </svg>
      <svg v-else viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 16h32M5 10q19 5 38 0M14 12v28m20-28v28M7 41 41 7" />
      </svg>
      <span class="sr-only">{{
        state === 'loading'
          ? english
            ? 'Loading the shrine'
            : '庭院加载中'
          : english
            ? 'The 3D scene is unavailable. Use the arrow to enter the site.'
            : '三维场景暂不可用，可通过箭头进入网站。'
      }}</span>
    </div>
    <nav
      class="world-controls"
      :aria-label="english ? 'Scene controls' : '场景控制'"
    >
      <div v-show="expanded" id="daylight-controls" class="daylight-controls">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
        </svg>
        <input
          v-model.number="hour"
          type="range"
          min="0"
          max="24"
          step="0.1"
          :disabled="state !== 'ready'"
          :aria-label="english ? 'Time of day' : '一天中的时间'"
          :aria-valuetext="timeValue"
        />
        <svg
          v-if="hour >= 6 && hour < 18"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 15.5A8 8 0 0 1 8.5 5 8 8 0 1 0 19 15.5Z" />
        </svg>
      </div>
      <button
        type="button"
        :aria-label="
          english ? 'Toggle daylight controls' : '展开或收起光照控制'
        "
        :aria-expanded="expanded"
        aria-controls="daylight-controls"
        @click="expanded = !expanded"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 17h16" />
          <circle cx="9" cy="7" r="2" />
          <circle cx="15" cy="17" r="2" />
        </svg>
      </button>
      <NuxtLink
        class="welcome-enter"
        to="/home"
        :prefetch="false"
        :aria-label="english ? 'Enter the site' : '进入网站'"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14m-5-5 5 5-5 5" />
        </svg>
      </NuxtLink>
    </nav>
  </main>
</template>

<style>
html[data-surface='welcome'],
html[data-surface='welcome'] body {
  margin: 0;
  background: #c9e4e8;
}
</style>
<style scoped>
.welcome-world {
  position: fixed;
  inset: 0;
  overflow: hidden;
  isolation: isolate;
  color: #334b4a;
  background: #c9e4e8;
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
.world-controls {
  position: absolute;
  top: max(24px, env(safe-area-inset-top));
  right: max(24px, env(safe-area-inset-right));
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border: 1px solid #fff9;
  border-radius: 28px;
  background: #f7f5e6d9;
  box-shadow: 0 4px 24px #243b3b14;
  backdrop-filter: blur(16px);
}
.world-controls button,
.welcome-enter {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.world-controls button:hover,
.welcome-enter:hover {
  background: #56715a15;
}
.world-controls svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}
.world-controls button circle {
  fill: #f7f5e6;
}
.world-controls :focus-visible {
  outline: 2px solid #9d3d24;
  outline-offset: 3px;
}
.daylight-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-right: 1px solid #334b4a22;
}
.daylight-controls input {
  width: clamp(80px, 12vw, 160px);
  height: 42px;
  margin: 0;
  accent-color: #a34a2c;
  cursor: ew-resize;
}
.daylight-controls input:disabled {
  opacity: 0.35;
  cursor: default;
}
.daylight-controls svg {
  width: 17px;
  height: 17px;
}
.welcome-status {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  pointer-events: none;
}
.welcome-status svg {
  width: 48px;
  height: 48px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
}
.loading-orbit circle {
  opacity: 0.15;
}
.loading-orbit {
  animation: orbit 2s linear infinite;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
@keyframes orbit {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 600px) {
  .world-controls {
    top: max(16px, env(safe-area-inset-top));
    right: max(16px, env(safe-area-inset-right));
  }
  .daylight-controls {
    gap: 8px;
    padding: 0 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .loading-orbit {
    animation: none;
  }
}
</style>
