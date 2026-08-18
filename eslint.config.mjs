import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Lint rules that carry a requirement are marked with the requirement id.
 * Style is deliberately light: the repository guards in scripts/guards enforce
 * the PRD constraints that actually matter, and they do it with better messages
 * than a lint rule could.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/test-results/**',
      '**/playwright-report/**',
      'packages/ui/src/tokens/tokens.css',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // ENG-001: an `any` at an authorization or data boundary is how a check
      // gets silently skipped.
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      eqeqeq: ['error', 'always'],
      'no-restricted-syntax': [
        'error',
        {
          // ENG-003 / ANL-002: nothing reaches an analytics or logging sink
          // without going through the typed event contract and redaction.
          selector: "MemberExpression[object.name='window'][property.name='dataLayer']",
          message: 'Analytics must go through @northstar/observability (ANL-001, ANL-002).',
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'e2e/**/*.ts', 'scripts/**/*.mjs'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', 'no-console': 'off' },
  },
);
