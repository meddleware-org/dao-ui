// Vite configuration for the console: the Vue plugin, and one dependency kept out of pre-bundling. `npm run dev` and `npm run build` read it.
// Vite's typed configuration helper.
import { defineConfig } from 'vite'
// The Vue single-file-component plugin.
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // The Vue plugin.
  plugins: [vue()],
  // Dependency pre-bundling.
  optimizeDeps: {
    // @meddleware/wallet-adapter ships TS + .vue source and holds the shared wallet singleton; if it
    // were pre-bundled, its .vue files (served raw) would load a second copy of the singleton in dev.
    exclude: ['@meddleware/wallet-adapter'],
  },
})
