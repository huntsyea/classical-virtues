import { defineConfig, globalIgnores } from 'eslint/config'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

export default defineConfig([
  globalIgnores([
    // Build output — ignore at any depth so nested worktrees/agent copies
    // (e.g. .paperclip/worktrees/*/.next) don't flood `pnpm lint` with tens of
    // thousands of errors from bundled vendor chunks.
    '**/.next/**',
    '**/node_modules/**',
    '.basehub/**',
    '.paperclip/**',
    'backups/**',
    'next-env.d.ts',
    'basehub-types.d.ts',
  ]),
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
])
