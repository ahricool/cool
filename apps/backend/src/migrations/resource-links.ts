import MarkdownIt from 'markdown-it';
export function rewriteResourceUrl(
  value: string,
  paths: ReadonlyMap<string, string>,
) {
  if (!value.startsWith('/') || value.startsWith('//')) return value;
  const boundary = value.search(/[?#]/);
  const path = boundary < 0 ? value : value.slice(0, boundary);
  const suffix = boundary < 0 ? '' : value.slice(boundary);
  const trailing = path.endsWith('/') ? '/' : '';
  const canonical = trailing ? path.slice(0, -1) : path;
  return paths.has(canonical)
    ? paths.get(canonical)! + trailing + suffix
    : value;
}
/** Change parsed, root-relative Markdown destinations; preserve code and external URLs verbatim. */
export function rewriteResourceLinks(
  source: string,
  paths: ReadonlyMap<string, string>,
) {
  const md = new MarkdownIt({ html: false });
  const env: { references?: Record<string, { href: string; title: string }> } =
    {};
  const tokens = md.parse(source, env);
  const starts = [0];
  for (let i = 0; i < source.length; i++)
    if (source[i] === '\n') starts.push(i + 1);
  starts.push(source.length);
  const code = tokens
    .filter((t) => (t.type === 'fence' || t.type === 'code_block') && t.map)
    .map((t) => [starts[t.map![0]]!, starts[t.map![1]] ?? source.length]);
  const excluded = (position: number) =>
    code.some(([start, end]) => position >= start! && position < end!);
  const escaped = (position: number) => {
    let count = 0;
    while (position > 0 && source[--position] === '\\') count++;
    return count % 2 === 1;
  };
  const edits: { start: number; end: number; value: string }[] = [];
  const state = new md.inline.State(source, md, env, []);
  for (let i = 0; i < source.length; i++) {
    if (excluded(i) || escaped(i)) continue;
    if (source[i] === '`') {
      let end = i;
      while (source[end] === '`') end++;
      const run = end - i;
      let close = end;
      while ((close = source.indexOf('`', close)) >= 0) {
        let after = close;
        while (source[after] === '`') after++;
        if (after - close === run) {
          i = after - 1;
          break;
        }
        close = after;
      }
      if (close < 0) i = end - 1;
      continue;
    }
    if (source[i] !== '[') continue;
    const labelEnd = md.helpers.parseLinkLabel(state, i, true);
    if (labelEnd < 0 || source[labelEnd + 1] !== '(') continue;
    let start = labelEnd + 2;
    while (/\s/.test(source[start] ?? '') && start < source.length) start++;
    const destination = md.helpers.parseLinkDestination(
      source,
      start,
      source.length,
    );
    if (!destination.ok) continue;
    let tail = destination.pos;
    while (/\s/.test(source[tail] ?? '') && tail < source.length) tail++;
    if (source[tail] !== ')') {
      const title = md.helpers.parseLinkTitle(source, tail, source.length);
      if (!title.ok) continue;
      tail = title.pos;
      while (/\s/.test(source[tail] ?? '') && tail < source.length) tail++;
      if (source[tail] !== ')') continue;
    }
    const angle = source[start] === '<';
    const literalStart = start + Number(angle);
    const literalEnd = destination.pos - Number(angle);
    const literal = source.slice(literalStart, literalEnd);
    const changed = rewriteResourceUrl(literal, paths);
    if (changed !== literal)
      edits.push({ start: literalStart, end: literalEnd, value: changed });
    i = tail;
  }
  // Reference definitions are checked against the parser's resolved reference table.
  for (let line = 0; line < starts.length - 1; line++) {
    const offset = starts[line]!;
    if (excluded(offset)) continue;
    const text = source.slice(offset, starts[line + 1]);
    const match = /^[ \t]{0,3}\[([^\]\n]+)\]:[ \t]*(<?)(\/[^\s>]+)(>?)/.exec(
      text,
    );
    if (!match) continue;
    const label = md.utils.normalizeReference(match[1]!);
    const parsed = env.references?.[label];
    if (!parsed || parsed.href !== match[3]) continue;
    const changed = rewriteResourceUrl(match[3]!, paths);
    if (changed === match[3]) continue;
    const start = offset + match[0].indexOf(match[3]!);
    edits.push({ start, end: start + match[3]!.length, value: changed });
  }
  let result = source;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    result = result.slice(0, edit.start) + edit.value + result.slice(edit.end);
  return result;
}
