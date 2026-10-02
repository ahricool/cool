import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  { ignores: ['**/dist/**', '**/generated/**', 'node_modules/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
    languageOptions: {
      globals: {
        require: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
      },
    },
  },
);
