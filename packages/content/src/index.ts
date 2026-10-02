import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/common';
export * from './types';
export interface Heading {
  id: string;
  text: string;
  level: number;
}
export function renderMarkdown(source: string): {
  html: string;
  toc: Heading[];
} {
  const toc: Heading[] = [];
  const md = new MarkdownIt({
    html: false,
    linkify: false,
    typographer: false,
    highlight(code, language) {
      return language && hljs.getLanguage(language)
        ? hljs.highlight(code, { language, ignoreIllegals: true }).value
        : '';
    },
  });
  const fenceRule = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, idx, options, env, self) =>
    fenceRule(tokens, idx, options, env, self)
      .replace('<pre>', '<pre class="highlight-wrap">')
      .replace('<code class="', '<code class="hljs ')
      .replace('<code>', '<code class="hljs">');
  md.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
    const token = tokens[idx]!;
    const id = `heading-${toc.length + 1}`;
    token.attrSet('id', id);
    toc.push({
      id,
      text: tokens[idx + 1]?.children?.map((t) => t.content).join('') ?? '',
      level: Number(token.tag.slice(1)),
    });
    return self.renderToken(tokens, idx, options);
  };
  md.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
    tokens[idx]!.attrSet('rel', 'noopener noreferrer');
    return self.renderToken(tokens, idx, options);
  };
  const imageRule = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!;
    const src = token.attrGet('src') ?? '';
    if (
      !/^\/(?:api\/v1\/media\/[a-f0-9-]+\.webp|sakura\/images\/[a-zA-Z0-9_./@-]+)$/.test(
        src,
      ) ||
      src.includes('..')
    )
      return md.utils.escapeHtml(token.content);
    token.attrSet('loading', 'lazy');
    token.attrSet('decoding', 'async');
    return imageRule(tokens, idx, options, env, self);
  };
  return { html: md.render(source), toc };
}
