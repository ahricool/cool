import { ElMessage } from 'element-plus';
import { adminFeedbackTarget } from '~/features/admin/feedback';
type ToastKind = 'success' | 'error' | 'warning' | 'info' | 'danger';
/** Keep Element Plus alert semantics, stacking, hover pause and existing timeout. */
function notify(kind: ToastKind, message: string) {
  const appendTo = adminFeedbackTarget();
  if (!appendTo) return { close: () => {} };
  const header = document.querySelector('.topbar, .site-header');
  return ElMessage({
    appendTo,
    message,
    type: kind === 'danger' ? 'error' : kind,
    placement: 'top-left',
    offset: (header?.getBoundingClientRect().height ?? 64) + 16,
    customClass: `sakura-toast sakura-toast--${kind}`,
  });
}
export const toast = {
  success: (message: string) => notify('success', message),
  error: (message: string) => notify('error', message),
  warning: (message: string) => notify('warning', message),
  info: (message: string) => notify('info', message),
  danger: (message: string) => notify('danger', message),
};
