import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: ['dist', 'build', 'node_modules', 'coverage'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // React Compiler 계열 규칙은 지금 설계와 정면으로 부딪히는 곳이 있다.
      // 예를 들어 I18nProvider의 runtimeLocale은 훅을 쓸 수 없는 클래스 컴포넌트에
      // 현재 언어를 전달하려고 일부러 둔 모듈 변수다. 린트를 처음 들이면서
      // 대규모 리팩터링을 강제하지 않도록 경고로 두고 점진적으로 줄인다.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/globals': 'warn',
      'preserve-caught-error': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: ['scripts/**/*.{ts,mjs}', 'vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // 비 ASCII 경로를 판별하는 정규식이 제어 문자 범위를 정당하게 사용한다.
      'no-control-regex': 'off',
    },
  },
  {
    // 서비스 워커는 문서가 아니라 워커 스코프에서 돈다. self와 caches가 그곳의 전역이다.
    files: ['public/sw.js'],
    languageOptions: {
      globals: globals.serviceworker,
    },
  }
);
