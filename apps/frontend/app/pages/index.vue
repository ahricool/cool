<script setup lang="ts">
import type { WelcomeWorld, Weather } from '~/features/welcome/world';

definePageMeta({ layout: false });
const host = ref<HTMLElement>();
const menu = ref<HTMLElement>();
const enter = ref<HTMLElement>();
const state = ref<'loading' | 'ready' | 'unavailable'>('loading');
const { locale } = useCoolI18n();
const english = computed(() => locale.value === 'en');
const hour = ref(10.5);
// The menu opens on demand and only exists once the scene is ready.
const menuOpen = ref(false);
const timeValue = computed(() => {
  const minutes = Math.round((hour.value % 24) * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
let world: WelcomeWorld | undefined;
let cancelled = false;
watch(hour, (value) => world?.setHour(value));
// Each real minute rolls the weather: light rain one time in three. Choosing
// it from the menu holds that weather for the next minute instead.
const WEATHER_MS = 60 * 1000;
const weather = ref<Weather>('clear');
let weatherUntil = 0;
watch(weather, (value) => world?.setWeather(value));
function toggleWeather() {
  weather.value = weather.value === 'rain' ? 'clear' : 'rain';
  weatherUntil = performance.now() + WEATHER_MS;
}
// One in-scene day every ten real minutes; held still while the slider is dragged.
const DAY_MS = 10 * 60 * 1000;
const dragging = ref(false);
let clock: ReturnType<typeof setInterval> | undefined;
let lastTick = 0;
function tick() {
  const now = performance.now();
  const elapsed = Math.min(now - lastTick, 1000);
  lastTick = now;
  if (document.hidden || state.value !== 'ready') return;
  if (now >= weatherUntil) {
    weather.value = Math.random() < 1 / 3 ? 'rain' : 'clear';
    weatherUntil = now + WEATHER_MS;
  }
  if (dragging.value) return;
  hour.value = (hour.value + (elapsed / DAY_MS) * 24) % 24;
}
useHead({ title: '梦桜' });
onMounted(async () => {
  try {
    const { mountWelcomeWorld } = await import('~/features/welcome/world');
    if (cancelled || !host.value) return;
    world = mountWelcomeWorld(
      host.value,
      () => {
        state.value = 'unavailable';
      },
      menu.value,
      enter.value,
    );
    world.setHour(hour.value);
    state.value = 'ready';
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lastTick = performance.now();
      // The visit opens on the current clear weather; the first roll is a minute in.
      weatherUntil = lastTick + WEATHER_MS;
      clock = setInterval(tick, 250);
    }
  } catch {
    if (!cancelled) state.value = 'unavailable';
  }
});
onBeforeUnmount(() => {
  cancelled = true;
  clearInterval(clock);
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
          ? 'A miniature shrine on a summer meadow where Sparkle walks in the courtyard. Drag to rotate, scroll or pinch to zoom.'
          : '草坪上的神社微缩庭院，花火在前院散步。拖动旋转，滚轮或双指缩放。'
      "
    />
    <nav
      ref="menu"
      class="world-controls"
      :data-board="state === 'ready' || undefined"
      :aria-label="english ? 'Scene controls' : '场景控制'"
    >
      <div
        class="scene-menu-reveal"
        :class="{ 'is-open': menuOpen }"
        :inert="!menuOpen"
        :aria-hidden="!menuOpen"
      >
        <div id="scene-menu" class="scene-menu">
          <div class="daylight-controls">
            <svg data-icon="clock" viewBox="0 0 24 24" aria-hidden="true">
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
              @pointerdown="dragging = true"
              @pointerup="dragging = false"
              @pointercancel="dragging = false"
            />
            <svg
              v-if="hour >= 6 && hour < 18"
              data-icon="daylight"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"
              />
            </svg>
            <svg
              v-else
              data-icon="daylight"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M19 15.5A8 8 0 0 1 8.5 5 8 8 0 1 0 19 15.5Z" />
            </svg>
          </div>
          <button
            type="button"
            :aria-label="
              weather === 'rain'
                ? english
                  ? 'Weather: light rain. Switch to clear skies'
                  : '天气：小雨，切换为晴天'
                : english
                  ? 'Weather: clear. Switch to light rain'
                  : '天气：晴，切换为小雨'
            "
            :disabled="state !== 'ready'"
            @click="toggleWeather"
          >
            <svg data-icon="weather" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 17h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 17Z"
              />
              <path v-if="weather === 'rain'" d="M9 20l-1 2m5-2-1 2m5-2-1 2" />
            </svg>
          </button>
        </div>
      </div>
      <button
        type="button"
        :aria-label="english ? 'Toggle scene menu' : '展开或收起菜单'"
        :aria-expanded="menuOpen"
        aria-controls="scene-menu"
        @click="menuOpen = !menuOpen"
      >
        <span data-icon="toggle" aria-hidden="true" />
      </button>
    </nav>
    <!-- Always at hand once the scene is up; drawn as a small plaque of the same wood. -->
    <div
      ref="enter"
      class="world-controls world-enter"
      :data-board="state === 'ready' || undefined"
    >
      <NuxtLink
        class="welcome-enter"
        to="/home"
        :prefetch="false"
        :aria-label="english ? 'Enter the site' : '进入网站'"
      >
        <svg data-icon="enter" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </NuxtLink>
    </div>
  </main>
</template>

<style>
html[data-surface='welcome'],
html[data-surface='welcome'] body {
  margin: 0;
  background: #fff1f6;
}
</style>
<style scoped>
.welcome-world {
  position: fixed;
  inset: 0;
  overflow: hidden;
  isolation: isolate;
  color: #334b4a;
  background: #fff1f6;
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
.world-enter {
  top: auto;
  bottom: max(24px, env(safe-area-inset-bottom));
  padding: 4px;
  border-radius: 50%;
}
.world-controls.world-enter[data-board] {
  padding: 4px;
}
.world-controls.world-enter[data-board] .welcome-enter {
  width: 40px;
  height: 40px;
}
/* Nothing shows until the scene is ready; a failed scene leaves the bare background. */
.welcome-world:not([data-state='ready']) .world-controls {
  visibility: hidden;
}
/* Keep a measurable anchor for the Three.js blossom without a fallback icon. */
.world-controls [data-icon='toggle'] {
  display: block;
  width: 20px;
  height: 20px;
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
.scene-menu-reveal {
  display: grid;
  grid-template-columns: 0fr;
  transition: grid-template-columns 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.scene-menu-reveal.is-open {
  grid-template-columns: 1fr;
}
.scene-menu {
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 4px;
}
.scene-menu > * {
  flex-shrink: 0;
}
.world-controls[data-board] .scene-menu {
  gap: 2px;
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
/* Drawn by three.js as a wooden board (features/welcome/menu.ts); the DOM
   controls stay on top, transparent, inked to read on the wood. */
.world-controls[data-board] {
  gap: 2px;
  padding: 3px 4px;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  color: #4a2a1e;
}
.world-controls[data-board] button,
.world-controls[data-board] .welcome-enter {
  width: 32px;
  height: 32px;
}
/* Icons are modelled on the board; the SVGs stay as the fallback and as
   measured anchors for where the board draws them. */
.world-controls[data-board] svg {
  visibility: hidden;
}
/* No round backdrop on the board: the modelled icons stand on the wood. */
.world-controls[data-board] button:hover,
.world-controls[data-board] .welcome-enter:hover {
  background: transparent;
}
.world-controls[data-board] button circle {
  fill: #d3965c;
}
.world-controls[data-board] .daylight-controls {
  gap: 6px;
  padding: 0 8px 0 6px;
  border-right-color: transparent;
  color: #fff4dc;
}
.world-controls[data-board] .daylight-controls input {
  height: 30px;
  appearance: none;
  background: transparent;
}
.world-controls[data-board] .daylight-controls input::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  opacity: 0;
}
.world-controls[data-board] .daylight-controls input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: 0;
  opacity: 0;
}
@media (max-width: 600px) {
  .world-controls {
    top: max(16px, env(safe-area-inset-top));
    right: max(16px, env(safe-area-inset-right));
  }
  .world-enter {
    top: auto;
    bottom: max(16px, env(safe-area-inset-bottom));
  }
  .daylight-controls {
    gap: 8px;
    padding: 0 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .scene-menu-reveal {
    transition: none;
  }
}
</style>
