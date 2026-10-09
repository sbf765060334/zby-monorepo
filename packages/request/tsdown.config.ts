import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    internal: './src/internal.ts',
    'react-query': './src/react-query.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: ['@tanstack/react-query', '@zby/request'],
  },
})
