import {
  ElMessage,
  ElMessageBox,
  type ElMessageBoxOptions,
} from 'element-plus';

let active = false;
let target: HTMLElement | undefined;
let bodyWidth = '';
let bodyLocked = false;
const pending = new Set<() => void>();

export function enableAdminFeedback() {
  if (!active && typeof document !== 'undefined') {
    bodyWidth = document.body.style.width;
    bodyLocked = document.body.classList.contains('el-popup-parent--hidden');
  }
  active = true;
}

/** Command services live outside the layout, but still belong to Admin. */
export function adminFeedbackTarget() {
  if (!active || typeof document === 'undefined') return;
  if (!target) {
    target = document.createElement('div');
    target.dataset.adminFeedback = '';
    document.body.appendChild(target);
  }
  return target;
}

export function disposeAdminFeedback() {
  if (!active) return;
  active = false;
  for (const cancel of pending) cancel();
  pending.clear();
  ElMessage.closeAll();
  ElMessageBox.close();
  // Detach immediately: Element Plus otherwise retains its body nodes during
  // exit transitions, after the document has already changed to a blog theme.
  target?.remove();
  target = undefined;
  // Element Plus restores its scroll lock after 200ms. Restore the surface's
  // original body state now, so a public page never inherits that inline width.
  if (typeof document !== 'undefined') {
    document.body.style.width = bodyWidth;
    document.body.classList.toggle('el-popup-parent--hidden', bodyLocked);
  }
}

export function adminConfirm(
  message: string,
  title: string,
  options: ElMessageBoxOptions = {},
) {
  const appendTo = adminFeedbackTarget();
  if (!appendTo) return Promise.reject(new Error('Admin is no longer active'));
  return new Promise((resolve, reject) => {
    const cancel = () => {
      pending.delete(cancel);
      reject(new Error('Admin navigation cancelled this confirmation'));
    };
    pending.add(cancel);
    ElMessageBox.confirm(message, title, { ...options, appendTo })
      .then(resolve, reject)
      .finally(() => pending.delete(cancel));
  });
}
