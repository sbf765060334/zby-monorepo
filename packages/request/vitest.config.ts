import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@zby/request/internal',
        replacement: fileURLToPath(new URL('./src/internal.ts', import.meta.url)),
      },
      {
        find: /^@zby\/request$/,
        replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      },
    ],
  },
})
