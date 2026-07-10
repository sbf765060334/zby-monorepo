import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    'locales/index': './src/locales/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      'antd',
      '@ant-design/icons',
      '@ant-design/cssinjs',
      '@zby/intl',
    ],
  },
})
