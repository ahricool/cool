/** Owns the reading shell's drawer, focus and scroll lifecycle. */
export function useReadingShell() {
  const menuOpen = ref(false);
  const menuTrigger = ref<HTMLButtonElement>();
  const sidebar = ref<HTMLElement>();
  const mobileQuery = ref('');
  const mobileSearchFailure = ref('');
  let previousOverflow = '';
  const dark = ref(false);
  const scrollProgress = ref(0);
  onMounted(() => {
    const resize = () => {
      if (window.innerWidth > 768) menuOpen.value = false;
      updateScroll();
    };
    const updateScroll = () => {
      const hero = document.getElementById('hero-artwork');
      const distance = Math.max(160, (hero?.offsetHeight ?? 320) - 80);
      scrollProgress.value = Math.min(1, window.scrollY / distance);
    };
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', resize);
    onUnmounted(() => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', updateScroll);
      if (menuOpen.value) document.body.style.overflow = previousOverflow;
    });
  });
  watch(menuOpen, async (open) => {
    if (open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      await nextTick();
      sidebar.value
        ?.querySelector<HTMLElement>('button, a[href], input, select')
        ?.focus();
    } else {
      document.body.style.overflow = previousOverflow;
      await nextTick();
      menuTrigger.value?.focus();
    }
  });
  function sidebarKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      menuOpen.value = false;
      return;
    }
    if (event.key !== 'Tab') return;
    const items = sidebar.value?.querySelectorAll<HTMLElement>(
      'button, a[href], input, select',
    );
    if (!items?.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  const route = useRoute();
  watch(
    () => route.fullPath,
    () => {
      menuOpen.value = false;
    },
  );
  return {
    menuOpen,
    menuTrigger,
    sidebar,
    dark,
    scrollProgress,
    mobileQuery,
    mobileSearchFailure,
    sidebarKeydown,
  };
}
