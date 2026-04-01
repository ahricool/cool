import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function renderContent(content?: string): string {
  if (!content) {
    return '';
  }

  const rendered = marked.parse(content, { async: false });
  return DOMPurify.sanitize(rendered);
}
