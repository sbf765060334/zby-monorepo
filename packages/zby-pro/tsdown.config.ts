import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    'locale/zh_CN': './src/locale/zh_CN.ts',
    'locale/en_US': './src/locale/en_US.ts',
    'locale/vi_VN': './src/locale/vi_VN.ts',
    'locale/my_MM': './src/locale/my_MM.ts',
    'pro-layout/index': './src/components/pro-layout/index.ts',
    'pro-modal/index': './src/components/pro-modal/index.ts',
    'pro-sortable-list/index': './src/components/pro-sortable-list/index.ts',
    'pro-view-management/index': './src/components/pro-view-management/index.ts',
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
      '@zby/ui',
      '@ant-design/icons',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      '@rc-component/util',
      'clsx',
    ],
  },
})
