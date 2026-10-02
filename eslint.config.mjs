import js from '@eslint/js';
import ts from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
export default ts.config(
  {
    ignores: [
      '**/dist/**',
      '**/generated/**',
      'node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      'apps/frontend/public/sakura/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: ts.parser, extraFileExtensions: ['.vue'] },
    },
    rules: { 'vue/multi-word-component-names': 'off', 'no-undef': 'off' },
  },
  { files: ['apps/frontend/**/*.ts'], rules: { 'no-undef': 'off' } },
  {
    files: ['**/*.cjs', 'scripts/*.mjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
    languageOptions: {
      globals: {
        require: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
      },
    },
  },
);
