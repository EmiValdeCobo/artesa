import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'docs/brand/**', 'pnpm-lock.yaml'] },
  { files: ['**/*.{js,jsx}'], ...js.configs.recommended, languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node } }, rules: { 'no-unused-vars': 'off' } },
  { files: ['frontend/src/**/*.{js,jsx}'], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } }, plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh }, rules: { 'react-hooks/rules-of-hooks': 'warn', 'react-hooks/exhaustive-deps': 'warn', 'react-refresh/only-export-components': 'off' } },
];
