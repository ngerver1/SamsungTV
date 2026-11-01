// Development only. The TV runtime must stay ES5: no let/const, arrow functions,
// template strings, classes or modules inside app/.
export default [{
  files: ['app/**/*.js'],
  languageOptions: {
    ecmaVersion: 5,
    sourceType: 'script',
    globals: {
      window: 'readonly', document: 'readonly', Image: 'readonly', localStorage: 'readonly',
      setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
      tizen: 'readonly', SerifDevice: 'readonly', SerifCatalog: 'readonly'
    }
  },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-unreachable': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-func-assign': 'error',
    'no-global-assign': 'error',
    'no-unexpected-multiline': 'error',
    'valid-typeof': 'error',
    eqeqeq: ['error', 'always']
  }
}];
