import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    'locales/index': './src/locales/index.ts',
    'pro-layout/index': './src/components/pro-layout/index.ts',
    'pro-layout/react-router': './src/components/pro-layout/react-router.ts',
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
      '@ant-design/cssinjs',
      'react-router-dom',
      '@zby/hooks',
      '@zby/intl',
      '@zby/router-core',
      '@zby/router-core/react',
      '@zby/router-core/react-router',
      '@zby/ui',
      '@ant-design/icons',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      'clsx',
    ],
  },
})
