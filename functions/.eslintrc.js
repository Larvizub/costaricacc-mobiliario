module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: [
    'eslint:recommended',
    'plugin:promise/recommended'
  ],
  plugins: [
    'promise'
  ],
  rules: {
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
  },
};
