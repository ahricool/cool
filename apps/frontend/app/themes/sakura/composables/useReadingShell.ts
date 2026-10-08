/** Keeps the reading header in sync with the active page banner. */
export function useReadingShell() {
  const { dark, canToggle } = usePublicColorMode();
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
    });
  });
  return {
    dark,
    canToggle,
    scrollProgress,
    hasBanner,
    hasIllustration,
    registerBanner,
  };
}
