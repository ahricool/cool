import type { AnyNode, Plugin, Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';

import { siteThemes } from '../app/themes/registry';

type Surface = string;

function surfaceFor(file: string): Surface | undefined {
  const path = file.replaceAll('\\', '/');
  const theme = siteThemes.find((entry) =>
    path.includes(`/themes/${entry.directory}/`),
  );
  if (theme) return theme.id;
  if (path.includes('/assets/blog/')) return 'blog';
  if (
    path.includes('/assets/admin/') ||
    path.includes('/features/admin/') ||
    path.includes('/element-plus/')
  ) {
    return 'admin';
  }
}

function insideKeyframes(rule: Rule): boolean {
  let parent: AnyNode | undefined = rule.parent;
  while (parent) {
    if (parent.type === 'atrule' && /(?:^|-)keyframes$/i.test(parent.name)) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function scopeSelector(selector: string, surface: Surface): string {
  const constraint =
    surface !== 'blog' && surface !== 'admin'
      ? `[data-surface='blog'][data-site-theme='${surface}']`
      : `[data-surface='${surface}']`;
  // :where adds no specificity, keeping component rules independent of the surface boundary.
  const rootScope = selectorParser().astSync(`:where(html${constraint})`).first
    .first;
  const rootConstraint = selectorParser().astSync(`:where(${constraint})`).first
    .first;

  return selectorParser((selectors) => {
    selectors.each((entry) => {
      const firstCompound = [];
      for (const node of entry.nodes) {
        if (node.type === 'combinator') break;
        firstCompound.push(node);
      }
      const isPseudoElement = (node: selectorParser.Node) =>
        node.type === 'pseudo' &&
        (/^::/.test(node.value) ||
          /^:(before|after|first-line|first-letter)$/.test(node.value));
      const rootDark =
        firstCompound.some(
          (node) => node.type === 'class' && node.value === 'dark',
        ) &&
        firstCompound.every(
          (node) =>
            (node.type === 'class' && node.value === 'dark') ||
            node.type === 'comment' ||
            isPseudoElement(node),
        );
      const targetsRoot =
        rootDark ||
        firstCompound.some(
          (node) =>
            (node.type === 'tag' && node.value.toLowerCase() === 'html') ||
            (node.type === 'pseudo' && node.value === ':root'),
        );

      if (targetsRoot) {
        // A pseudo-element must remain last within its compound selector.
        const pseudoElement = firstCompound.find(isPseudoElement);
        if (pseudoElement) {
          entry.insertBefore(pseudoElement, rootConstraint.clone());
        } else {
          entry.insertAfter(firstCompound.at(-1)!, rootConstraint.clone());
        }
      } else {
        entry.prepend(selectorParser.combinator({ value: ' ' }));
        entry.prepend(rootScope.clone());
      }
    });
  }).processSync(selector);
}

/** Theme and Admin CSS can stay loaded without leaking resets, variables or animations. */
export default function surfaceStyles(): Plugin {
  return {
    postcssPlugin: 'sakura-surface-styles',
    Once(root, { result }) {
      const animations = new Map<string, string>();
      root.walkAtRules(/(?:^|-)keyframes$/i, (rule) => {
        const surface =
          surfaceFor(rule.source?.input.file ?? '') ??
          surfaceFor(result.opts.from ?? '');
        if (!surface) return;
        const name = rule.params.trim();
        const scoped = `cool-${surface}-${name}`;
        animations.set(name, scoped);
        rule.params = scoped;
      });
      root.walkDecls(/^(?:-webkit-)?animation(?:-name)?$/, (declaration) => {
        declaration.value = declaration.value.replace(
          /[\w-]+/g,
          (name) => animations.get(name) ?? name,
        );
      });
      root.walkRules((rule) => {
        const surface =
          surfaceFor(rule.source?.input.file ?? '') ??
          surfaceFor(result.opts.from ?? '');
        if (!surface || insideKeyframes(rule)) return;
        rule.selector = scopeSelector(rule.selector, surface);
      });
    },
  };
}
