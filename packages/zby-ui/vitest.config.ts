import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@rc-component/table/es': '@rc-component/table/lib',
    },
  },
})
