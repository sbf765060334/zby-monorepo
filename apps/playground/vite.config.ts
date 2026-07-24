import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const sourcePath = (path: string) =>
  new URL(path, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@zby/intl': sourcePath('../../packages/zby-intl/src/index.ts'),
      '@zby/router-core/react-router': sourcePath('../../packages/router-core/src/react-router/index.ts'),
      '@zby/router-core/react': sourcePath('../../packages/router-core/src/react/index.ts'),
      '@zby/router-core': sourcePath('../../packages/router-core/src/index.ts'),
      '@zby/pro': sourcePath('../../packages/zby-pro/src/index.ts'),
      '@zby/ui': sourcePath('../../packages/zby-ui/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
