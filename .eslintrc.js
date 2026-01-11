module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
    ecmaVersion: 2021,
  },
  plugins: ['@typescript-eslint', 'n8n-nodes-base'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:n8n-nodes-base/nodes',
    'prettier',
  ],
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '*.js',
    '!.eslintrc.js',
    'gulpfile.js',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'n8n-nodes-base/node-param-description-missing-final-period': 'off',
    'n8n-nodes-base/node-param-description-excess-final-period': 'off',
    'n8n-nodes-base/node-class-description-icon-not-svg': 'off',
    'n8n-nodes-base/node-param-fixed-collection-type-unsorted-items': 'off',
  },
  overrides: [
    {
      files: ['**/*.test.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
