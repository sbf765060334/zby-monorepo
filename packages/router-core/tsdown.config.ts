import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    'react/index': './src/react/index.ts',
    'react-router/index': './src/react-router/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: ['react', 'react-router-dom'],
  },
})
