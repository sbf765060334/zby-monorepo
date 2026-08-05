import { defineConfig } from 'tsdown'

const sharedConfig = {
  entry: {
    index: './src/index.ts',
    'locales/index': './src/locales/index.ts',
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
      '@rc-component/table',
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
      '@rc-component/table/es': '@rc-component/table/lib',
    },
    define: {
      __ZBY_TABLE_ESM__: 'false',
    },
  },
])
