import tseslint from 'typescript-eslint';
import next from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Flat config built directly on the Next plugin.
 *
 * `eslint-config-next@15` was removed: it loads @rushstack/eslint-patch, which
 * throws under ESLint 9 flat config, so `npm run lint` did not run at all.
 * A lint script that crashes is worse than no lint script — it looks green in
 * a pipeline that never checked anything.
 */
export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'shot.mjs'] },
  ...tseslint.configs.recommended,
  {
    plugins: { '@next/next': next, 'react-hooks': reactHooks },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);
