// See: https://eslint.org/docs/latest/use/configure/configuration-files

import { defineConfig } from 'eslint/config';
import { ISG } from 'eslint-config-intolerable-style-guide';

export default defineConfig([
  {
    ignores: ['eslint.config.mjs', , '**/dist'],
  },
  ISG,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
]);