/** Owns the reading shell's drawer, focus and scroll lifecycle. */
export function useReadingShell() {
  const menuOpen = ref(false);
  const menuTrigger = ref<HTMLButtonElement>();
  const sidebar = ref<HTMLElement>();
  function openMenu(event: Event) {
    menuTrigger.value = event.currentTarget as HTMLButtonElement;
    menuOpen.value = true;
  }
  const mobileQuery = ref('');
  const mobileSearchFailure = ref('');
  let previousOverflow = '';
  const dark = useState('reading-dark', () => false);
  const banner = shallowRef<HTMLElement>();
  const illustration = shallowRef<Readonly<Ref<boolean>>>();
  const hasIllustration = computed(() => illustration.value?.value ?? false);
  const hasBanner = computed(() => !!banner.value);
  const scrollProgress = ref(1);
  let bannerObserver: ResizeObserver | undefined;
  function updateScroll() {
    if (!import.meta.client) return;
    const element = banner.value;
    if (!element) {
      scrollProgress.value = 1;
      return;
    }
    const headerHeight =
      document.querySelector('.site-header')?.clientHeight ?? 64;
    const distance = Math.max(120, element.offsetHeight - headerHeight);
    const top = window.scrollY + element.getBoundingClientRect().top;
    scrollProgress.value = Math.min(
      1,
      Math.max(0, (window.scrollY - top) / distance),
    );
  }
  function registerBanner(
    element: HTMLElement,
    hasImage: Readonly<Ref<boolean>>,
  ) {
    bannerObserver?.disconnect();
    banner.value = element;
    illustration.value = hasImage;
    bannerObserver?.observe(element);
    updateScroll();
    return () => {
      if (banner.value !== element) return;
      bannerObserver?.unobserve(element);
      banner.value = undefined;
      illustration.value = undefined;
      updateScroll();
    };
  }
  onMounted(() => {
    const resize = () => {
      if (window.innerWidth > 768) menuOpen.value = false;
      updateScroll();
    };
    bannerObserver = new ResizeObserver(updateScroll);
    if (banner.value) bannerObserver.observe(banner.value);
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', resize);
    onUnmounted(() => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', updateScroll);
      bannerObserver?.disconnect();
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
    openMenu,
    sidebar,
    dark,
    scrollProgress,
    hasBanner,
    hasIllustration,
    registerBanner,
    mobileQuery,
    mobileSearchFailure,
    sidebarKeydown,
  };
}
