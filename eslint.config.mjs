import { defineConfig, globalIgnores } from 'eslint/config'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

export default defineConfig([
  globalIgnores([
    '.next/**',
    'node_modules/**',
    '.basehub/**',
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
