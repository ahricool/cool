import type { AnyNode, Plugin, Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';

type Surface = 'blog' | 'admin';

function surfaceFor(file: string): Surface | undefined {
  const path = file.replaceAll('\\', '/');
  if (path.includes('/assets/blog/')) return 'blog';
  if (path.includes('/assets/admin/') || path.includes('/element-plus/')) {
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
  // :where adds no specificity, preserving upstream component and theme overrides.
  const rootScope = selectorParser().astSync(
    `:where(html[data-surface='${surface}'])`,
  ).first.first;
  const rootConstraint = selectorParser().astSync(
    `:where([data-surface='${surface}'])`,
  ).first.first;

  return selectorParser((selectors) => {
    selectors.each((entry) => {
      const firstCompound = [];
      for (const node of entry.nodes) {
        if (node.type === 'combinator') break;
        firstCompound.push(node);
      }
      const targetsRoot = firstCompound.some(
        (node) =>
          (node.type === 'tag' && node.value.toLowerCase() === 'html') ||
          (node.type === 'pseudo' && node.value === ':root') ||
          (node.type === 'class' && node.value === 'dark'),
      );

      if (targetsRoot) {
        // A pseudo-element must remain last within its compound selector.
        const pseudoElement = firstCompound.find(
          (node) =>
            node.type === 'pseudo' &&
            (/^::/.test(node.value) ||
              /^:(before|after|first-line|first-letter)$/.test(node.value)),
        );
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

/** Keep both SPA surfaces loaded without leaking resets or CSS variables. */
export default function surfaceStyles(): Plugin {
  return {
    postcssPlugin: 'sakura-surface-styles',
    Once(root, { result }) {
      // Correct three upstream variable typos at build time; retain the source asset.
      root.walkDecls((declaration) => {
        const file = declaration.source?.input.file ?? result.opts.from ?? '';
        if (
          file.replaceAll('\\', '/').endsWith('/assets/blog/sakura.css') &&
          (declaration.prop === 'color' || declaration.prop === 'border')
        ) {
          declaration.value = declaration.value.replace(
            /(?:--)?var\(theme-color\)/g,
            'var(--theme-color)',
          );
        }
      });
      root.walkRules((rule) => {
        const surface = surfaceFor(
          rule.source?.input.file ?? result.opts.from ?? '',
        );
        if (!surface || insideKeyframes(rule)) return;
        rule.selector = scopeSelector(rule.selector, surface);
      });
    },
  };
}
