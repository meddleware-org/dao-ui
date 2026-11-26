// Vitest configuration for the unit and component tests (`npm test`): the Vue plugin, one copy of Vue, and the shared list of packages Vite processes.
// Vitest's typed configuration helper.
import { defineConfig } from 'vitest/config'
// The Vue single-file-component plugin.
import vue from '@vitejs/plugin-vue'
// The list of @meddleware packages Vite must process (they ship source and CSS).
import { inlineMeddleware } from '@meddleware/frontend-config/vitest'

// Unit tests for the read-only composables (event merge, gate null-filtering, proposals stub) plus
// the explorer-URL scheme safety. jsdom hosts the Vue reactivity; dedupe keeps a single Vue runtime.
export default defineConfig({
  // The Vue plugin.
  plugins: [vue()],
  // One copy of Vue and of the test utilities, however many packages depend on them.
  resolve: { dedupe: ['vue', '@vue/test-utils'] },
  test: {
    // A DOM for the component tests.
    environment: 'jsdom',
    // Where the tests are.
    include: ['tests/**/*.test.ts'],
    // Never the installed packages' own tests.
    exclude: ['node_modules/**'],
    // @meddleware/ui ships components that import CSS: Vite must process them (and PostCSS needs the shared browser list).
    server: { deps: { inline: inlineMeddleware } },
  },
})
