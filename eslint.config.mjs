/* eslint-disable import-x/no-unresolved */
/* eslint-disable import-x/no-named-as-default-member */
/* eslint-disable import-x/no-named-as-default */
/* eslint-disable import-x/default */
/* eslint-disable import-x/namespace */
import prettierPlugin from 'eslint-plugin-prettier';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import { plugins, rules } from 'eslint-config-airbnb-extended';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import jest from 'eslint-plugin-jest';
import * as pluginImportX from 'eslint-plugin-import-x';
import stylisticPlugin from '@stylistic/eslint-plugin';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import tsParser from '@typescript-eslint/parser';
import ts, { configs as tsConfigs } from 'typescript-eslint';
import testingLibrary from 'eslint-plugin-testing-library';
import jestDom from 'eslint-plugin-jest-dom';
import { fixupPluginRules } from '@eslint/compat';
import globals from 'globals';
import eslint from '@eslint/js';
import reactCompiler from 'eslint-plugin-react-compiler';

const GENERAL_RULES = {
  // Airbnb config rules, manually included by category to explicitly omit a few
  ...rules.base.es6.rules,
  ...rules.base.bestPractices.rules,
  ...rules.base.style.rules,
  // ...rules.base.stylistic.rules,
  ...rules.base.imports.rules,
  ...rules.base.variables.rules,
  ...rules.base.errors.rules,
  ...rules.react.base.rules,
  // ...rules.react.jsxA11y.rules,
  ...rules.react.stylistic.rules,
  '@typescript-eslint/no-redeclare': 'off',
  '@typescript-eslint/naming-convention': 'off',
  'prettier/prettier': ['error'],
  'no-underscore-dangle': 'off',
  'no-console': [
    'error',
    {
      allow: ['warn', 'error', 'table']
    }
  ],
  'import-x/no-dynamic-require': 'error',
  'import-x/no-nodejs-modules': 'off',
  'import-x/no-rename-default': 'off',
  'import-x/extensions': ['error', 'never', { svg: 'always' }],

  'react/jsx-props-no-spreading': [
    'warn',
    {
      custom: 'ignore'
    }
  ],
  'react/jsx-no-useless-fragment': 'error',
  'react-compiler/react-compiler': 'warn',
  'prefer-destructuring': [
    'error',
    {
      VariableDeclarator: {
        array: false,
        object: true
      },
      AssignmentExpression: {
        array: true,
        object: false
      }
    },
    {
      enforceForRenamedProperties: false
    }
  ],
  'global-require': 'off',
  'class-methods-use-this': 'off',
  'no-useless-catch': 'off',
  'no-unused-expressions': 'off',
  'no-case-declarations': 'off',
  'no-shadow': 'off',
  'no-else-return': 'off',
  'no-plusplus': 'off',
  'no-nested-ternary': 'off',
  'import-x/no-cycle': 'off',
  'react-hooks/rules-of-hooks': 'error',
  'react/jsx-filename-extension': 'off',
  'react/jsx-pascal-case': 'off',
  'react/prop-types': 'off',
  'react/destructuring-assignment': 'off',
  'react/no-unstable-nested-components': 'off',
  'react/function-component-definition': 'off',
  'react/jsx-no-constructed-context-values': 'off',
  'jsx-a11y/alt-text': 'off',
  'react/forbid-prop-types': 'off',
  'react/no-array-index-key': 'off',
  'no-restricted-syntax': 'off',
  'consistent-return': 'off',
  camelcase: 'off',
  radix: 'off',
  'array-callback-return': 'off',
  'no-param-reassign': [
    'error',
    { props: true, ignorePropertyModificationsFor: ['draft'] }
  ]
};

const GENERAL_PLUGINS = {
  prettier: prettierPlugin,
  '@stylistic': stylisticPlugin,
  'react-hooks': fixupPluginRules(reactHooks),
  react,
  jest,
  'testing-library': testingLibrary,
  'react-compiler': reactCompiler
};

// General settings to be used in the settings object in a specific config
const GENERAL_SETTINGS = {
  react: {
    version: 'detect', // React version. "detect" automatically picks the version you have installed.
    defaultVersion: '19.0' // Default React version to use when the version you have installed cannot be detected.
  }
};

const GENERAL_LANG_OPTIONS = {
  globals: {
    ...globals.browser,
    ...globals.node,
    ...globals.jest
  },
  ecmaVersion: 'latest',
  sourceType: 'module'
};

const jsFilesConfig = {
  files: ['**/*.{js,jsx}'],
  ignores: ['eslint.config.mjs'],
  plugins: {
    // Space reserved for future js-only plugins if we need it
    ...GENERAL_PLUGINS
  },
  settings: {
    // Space reserved for future js-only settings if we need it
    ...GENERAL_SETTINGS
  },
  languageOptions: {
    ...GENERAL_LANG_OPTIONS,

    parserOptions: {
      ecmaFeatures: {
        jsx: true
      }
    }
  },

  rules: {
    ...GENERAL_RULES,
    'no-unused-vars': [
      'warn',
      {
        caughtErrors: 'none'
      }
    ]
  }
};

const tsFilesConfig = {
  files: plugins.typescriptEslint.files,
  extends: [tsConfigs.recommended],
  ignores: ['eslint.config.mjs'],
  plugins: {
    // Space reserved for future ts-only plugins if we need it
    ...GENERAL_PLUGINS
  },
  settings: {
    'import-x/resolver-next': [
      createTypeScriptImportResolver({
        alwaysTryTypes: true // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
      })
    ],
    ...GENERAL_SETTINGS
  },
  languageOptions: {
    ...GENERAL_LANG_OPTIONS,

    parser: tsParser,
    parserOptions: {
      warnOnUnsupportedTypeScriptVersion: false,
      projectService: true,
      ecmaFeatures: {
        jsx: true
      }
    }
  },

  rules: {
    ...GENERAL_RULES,
    ...rules.typescript.base.rules,
    ...rules.typescript.stylistic.rules,
    'no-undef': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    'react/jsx-filename-extension': ['error', { extensions: ['.tsx', '.jsx'] }]
  }
};

export default ts.config(
  eslint.configs.recommended,
  pluginImportX.flatConfigs.recommended,
  react.configs.flat.recommended,
  testingLibrary.configs['flat/react'],
  jestDom.configs['flat/recommended'],

  jsFilesConfig,
  tsFilesConfig,

  // This needs to go last so the prettier rules will be overwritten properly
  prettierRecommended
);