import globals from 'globals';
import pluginJs from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { languageOptions: { globals: globals.browser } },
  {
    ignores: ['public/mediapipe'],
  },
  pluginJs.configs.recommended,
  prettierConfig,
  {
    plugins: { prettier },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
