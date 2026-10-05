export function useAdminMenu(id: string) {
  const route = useRoute();
  const activeMenu = inject<Ref<string | null>>('admin-active-menu', ref(null));
  const open = computed({
    get: () => activeMenu.value === id,
    set: (value) => {
      activeMenu.value = value
        ? id
        : activeMenu.value === id
          ? null
          : activeMenu.value;
    },
  });
  const root = ref<HTMLElement>();
  const trigger = ref<HTMLButtonElement>();
  const menu = ref<HTMLElement>();
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  function cancelClose() {
    clearTimeout(closeTimer);
  }
  function close(restoreFocus = false) {
    cancelClose();
    open.value = false;
    if (restoreFocus) trigger.value?.focus();
  }
  function hover(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    cancelClose();
    open.value = true;
  }
  function leave(event: PointerEvent) {
    if (
      event.pointerType !== 'mouse' ||
      menu.value?.contains(document.activeElement)
    )
      return;
    closeTimer = setTimeout(() => {
      if (!menu.value?.contains(document.activeElement)) close();
    }, 180);
  }
  function outside(event: PointerEvent) {
    if (
      open.value &&
      !root.value?.contains(event.target as Node) &&
      !menu.value?.contains(event.target as Node)
    )
      close();
  }
  function escape(event: KeyboardEvent) {
    if (open.value && event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  }
  const items = () =>
    Array.from(
      menu.value?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      ) ?? [],
    );
  async function triggerKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      close();
      return;
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    cancelClose();
    open.value = true;
    await nextTick();
    const links = items();
    (event.key === 'ArrowUp' ? links.at(-1) : links[0])?.focus();
  }
  function menuKeydown(event: KeyboardEvent) {
    const links = items();
    const index = links.indexOf(document.activeElement as HTMLElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? links.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) %
              links.length;
      links[next]?.focus();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const controls = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
        ),
      ).filter(
        (element) =>
          element.getClientRects().length && !menu.value?.contains(element),
      );
      const next =
        controls[controls.indexOf(trigger.value!) + (event.shiftKey ? -1 : 1)];
      close();
      next?.focus();
    }
  }
  watch(
    () => route.fullPath,
    () => close(menu.value?.contains(document.activeElement)),
  );
  onMounted(() => {
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
  });
  onBeforeUnmount(() => {
    cancelClose();
    document.removeEventListener('pointerdown', outside);
    document.removeEventListener('keydown', escape);
  });

  return {
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
  };
}
