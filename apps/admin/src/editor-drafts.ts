// Transfer in-flight edits across the new-record -> saved-record remount.
// sessionStorage remains the recovery copy if the tab reloads during navigation.
const pendingDrafts = new Map<string, string>();

export function transferEditorDraft(key: string, draft: string) {
  sessionStorage.setItem(key, draft);
  pendingDrafts.set(key, draft);
}

export function takeEditorDraft(key: string) {
  const draft = pendingDrafts.get(key);
  pendingDrafts.delete(key);
  return draft;
}
