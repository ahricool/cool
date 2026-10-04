import MarkdownIt from 'markdown-it';
const markdown = new MarkdownIt({ html: false });
/** A short, plain-text preview of the first three prose paragraphs. */
export function articlePreview(content: string) {
  const tokens = markdown.parse(content, {});
  const paragraphs: string[] = [];
  let remaining = 480;
  for (
    let i = 0;
    i < tokens.length && paragraphs.length < 3 && remaining > 0;
    i++
  ) {
    if (tokens[i]!.type !== 'paragraph_open') continue;
    const inline = tokens[i + 1];
    if (inline?.type !== 'inline') continue;
    const text = (inline.children ?? [])
      .filter((token) =>
        ['text', 'code_inline', 'softbreak', 'hardbreak'].includes(token.type),
      )
      .map((token) => (token.type.endsWith('break') ? ' ' : token.content))
      .join('')
      .trim();
    if (!text) continue;
    const characters = Array.from(text);
    paragraphs.push(
      characters.slice(0, remaining).join('') +
        (characters.length > remaining ? '…' : ''),
    );
    remaining -= Math.min(characters.length, remaining);
  }
  return paragraphs.join('\n\n');
}
