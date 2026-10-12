import { defineConfig } from 'tsdown'

const sharedConfig = {
  entry: {
    index: './src/index.ts',
    'locale/zh_CN': './src/locale/zh_CN.ts',
    'locale/en_US': './src/locale/en_US.ts',
    'locale/vi_VN': './src/locale/vi_VN.ts',
    'locale/my_MM': './src/locale/my_MM.ts',
  },
  dts: true,
  sourcemap: true,
  treeshake: {
    moduleSideEffects: false,
  },
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      'antd',
      '@radix-ui/react-scroll-area',
      '@rc-component/context',
      '@rc-component/resize-observer',
      '@rc-component/virtual-list',
      '@ant-design/icons',
      '@ant-design/cssinjs',
      '@zby/intl',
    ],
  },
}

export default defineConfig([
  {
    ...sharedConfig,
    name: 'esm',
    format: ['esm'],
    clean: true,
    define: {
      __ZBY_TABLE_ESM__: 'true',
    },
  },
  {
    ...sharedConfig,
    name: 'cjs',
    format: ['cjs'],
    clean: false,
    alias: {
      'antd/es': 'antd/lib',
    },
    define: {
      __ZBY_TABLE_ESM__: 'false',
    },
  },
])
