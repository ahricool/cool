export function formatDate(value?: string) {
  if (!value) {
    return '';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function calcReadingTime(content = '') {
  const plain = content.replace(/<[^>]*>/g, '').trim();
  const words = plain.length;
  return Math.max(1, Math.round(words / 320));
}
