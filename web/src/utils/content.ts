import DOMPurify from 'dompurify';
import { marked } from 'marked';
import hljs from 'highlight.js';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function renderContent(content: string) {
  const source = content || '';
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(source);
  const html = looksLikeHtml ? source : marked.parse(source, { async: false });
  return DOMPurify.sanitize(html as string);
}

export function highlightCodeBlocks(container: ParentNode = document) {
  container.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block as HTMLElement);
  });
}
