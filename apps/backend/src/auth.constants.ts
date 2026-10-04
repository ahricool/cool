// This is a single-author site. There is no account registration or email change.
export const ADMIN_EMAIL = 'whoreahri@gmail.com';
export function defaultDisplayName(email: string) {
  return email.split('@')[0]!.replace(/^./u, (first) => first.toUpperCase());
}
export const ADMIN_DISPLAY_NAME = defaultDisplayName(ADMIN_EMAIL);
export const SESSION_COOKIE = 'cool_session';
export const SESSION_COOKIE_AGE_MS = 15 * 24 * 60 * 60 * 1000;

export function normalizeOwner<T extends { displayName: string }>(owner: T): T {
  return {
    ...owner,
    displayName: owner.displayName.trim() || ADMIN_DISPLAY_NAME,
  };
}
