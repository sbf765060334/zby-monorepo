import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const require = createRequire(import.meta.url)
const dayjsDir = dirname(require.resolve('dayjs/package.json'))

const sourcePath = (path: string) =>
  new URL(path, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'dayjs',
      'dayjs/plugin/advancedFormat',
      'dayjs/plugin/isoWeek',
      'dayjs/plugin/weekOfYear',
      'dayjs/locale/zh-cn',
    ],
  },
  resolve: {
    alias: [
      { find: '@zby/hooks', replacement: sourcePath('../../packages/hooks/index.ts') },
      { find: '@zby/intl', replacement: sourcePath('../../packages/zby-intl/src/index.ts') },
      { find: '@zby/router-core/react-router', replacement: sourcePath('../../packages/router-core/src/react-router/index.ts') },
      { find: '@zby/router-core/react', replacement: sourcePath('../../packages/router-core/src/react/index.ts') },
      { find: '@zby/router-core', replacement: sourcePath('../../packages/router-core/src/index.ts') },
      { find: '@zby/pro', replacement: sourcePath('../../packages/zby-pro/src/index.ts') },
      { find: '@zby/ui', replacement: sourcePath('../../packages/zby-ui/src/index.ts') },
      { find: /^dayjs$/, replacement: `${dayjsDir}/dayjs.min.js` },
      { find: /^dayjs\/(.*)$/, replacement: `${dayjsDir}/$1` },
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
