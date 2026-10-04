/** Shared modal navigation focus, Escape and scroll-lock lifecycle. */
export function useDrawerFocus(
  open: Ref<boolean>,
  sidebar: Ref<HTMLElement | undefined>,
  trigger: Ref<HTMLButtonElement | undefined>,
) {
  let previousOverflow = '';
  const focusable = () =>
    sidebar.value?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])',
    );
  watch(open, async (value) => {
    if (value) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      await nextTick();
      if (open.value) focusable()?.[0]?.focus();
    } else {
      document.body.style.overflow = previousOverflow;
      await nextTick();
      if (
        document.activeElement === document.body ||
        sidebar.value?.contains(document.activeElement)
      )
        trigger.value?.focus();
    }
  });
  onBeforeUnmount(() => {
    if (open.value) document.body.style.overflow = previousOverflow;
  });
  return (event: KeyboardEvent) => {
    if (!open.value) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      open.value = false;
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusable();
    const first = items?.[0];
    const last = items?.[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
}
