import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@main': resolve(__dirname, 'src/main'),
      '@preload': resolve(__dirname, 'src/preload'),
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared'),
      // Main-process unit tests run in plain Node without the Electron binary.
      electron: resolve(__dirname, 'tests/stubs/electron.ts')
    }
  },
  test: {
    environment: 'node',
    globals: true
  }
})
