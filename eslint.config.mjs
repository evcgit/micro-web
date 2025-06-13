/* eslint-disable import-x/no-unresolved */
/* eslint-disable import-x/no-named-as-default-member */
/* eslint-disable import-x/no-named-as-default */
/* eslint-disable import-x/default */
/* eslint-disable import-x/namespace */
import prettierPlugin from 'eslint-plugin-prettier';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import { fixupPluginRules } from '@eslint/compat';
import globals from 'globals';
import eslint from '@eslint/js';

export default [
  eslint.configs.recommended,
  react.configs.flat.recommended,

  {
    files: ['**/*.{js,jsx}'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'webpack.config.js',
      'eslint.config.mjs'
    ],

    plugins: {
      prettier: prettierPlugin,
      'react-hooks': fixupPluginRules(reactHooks),
      react
    },

    settings: {
      react: {
        version: 'detect'
      }
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },

    rules: {
      // Prettier rules
      'prettier/prettier': ['error'],

      // React rules
      'react/react-in-jsx-scope': 'off', // React 17+ doesn't need this
      'react/prop-types': 'off', // Turn off prop-types since we're not using TypeScript
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General rules
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error'
    }
  },

  // This needs to go last so prettier rules override properly
  prettierRecommended
];
