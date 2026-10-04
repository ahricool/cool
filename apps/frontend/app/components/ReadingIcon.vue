<script setup lang="ts">
defineProps<{
  name:
    | 'search'
    | 'home'
    | 'archive'
    | 'categories'
    | 'tag'
    | 'moments'
    | 'photos'
    | 'document'
    | 'pages'
    | 'settings'
    | 'user'
    | 'logout';
}>();
</script>
<template>
  <svg
    class="navigation-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'search'">
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="m16 16 4.25 4.25" />
    </template>
    <template v-else-if="name === 'home'">
      <path d="m3 10 9-7 9 7v10H3Z" />
      <path d="M9 20v-7h6v7" />
    </template>
    <template v-else-if="name === 'archive'">
      <path d="M3 4h18v5H3ZM5 9v11h14V9M9 13h6" />
    </template>
    <template v-else-if="name === 'categories'">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </template>
    <template v-else-if="name === 'tag'">
      <path d="M3 3h8l10 10-8 8L3 11Z" />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'moments'">
      <path
        d="M21 11a8 8 0 0 1-8 8H8l-5 3v-7a8 8 0 0 1 0-8 8 8 0 0 1 7-4h3a8 8 0 0 1 8 8Z"
      />
      <path d="M7 10h10M7 14h6" />
    </template>
    <template v-else-if="name === 'document'">
      <path d="M5 3h9l5 5v13H5ZM14 3v5h5M9 12h6M9 16h6" />
    </template>
    <template v-else-if="name === 'pages'">
      <path d="M8 3h13v14H8ZM3 7v14h13M12 7h5M12 11h5" />
    </template>
    <template v-else-if="name === 'settings'">
      <path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z" />
      <circle cx="12" cy="12" r="3" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </template>
    <template v-else-if="name === 'logout'">
      <path d="M9 3H4v18h5M10 12h11m-4-4 4 4-4 4" />
    </template>
    <template v-else>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      <path d="m3 17 6-5 4 4 3-3 5 5" />
    </template>
  </svg>
</template>
