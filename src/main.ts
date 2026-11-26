// Standalone SPA bootstrap. Loads the design-token + ui base stylesheets and the
// console's qt.css, then mounts the App shell. (The library path — src/index.ts —
// bypasses this and relies on DaoView's own scoped qt.css import instead.)
// The design tokens: every colour, space and type size the components use.
import '@meddleware/design-tokens/tokens.css'
// The seasonal accent colours that `useSeason` switches between.
import '@meddleware/design-tokens/seasons.css'
// The shared base styles.
import '@meddleware/ui/base.css'
// The console's own utility classes.
import './styles/qt.css'
// Vue's application factory.
import { createApp } from 'vue'
// `loadRuntimeConfig` reads /runtime-config.json; `useSeason` applies the seasonal colours.
import { loadRuntimeConfig, useSeason } from '@meddleware/ui'
// The shared network selector.
import { useNetwork } from '@meddleware/wallet-adapter'

// The standalone build targets one network; select it in the shared selector so the client, the
// ids, the explorer links and the status bar all agree. (Embedded, the host's selector rules.)
// The network this build targets; testnet unless told otherwise.
const built = import.meta.env.VITE_NETWORK || 'testnet'
// Only the two public networks are accepted here; anything else leaves the selector's own default.
if (built === 'testnet' || built === 'mainnet') useNetwork().setNetwork(built)

// Apply the seasonal accent colours.
useSeason()
// Machine-zone endpoints (the indexer, the Walrus relays) come from /runtime-config.json when the deployment
// serves one (ADR-0005); load it before any module that reads them is imported.
// Load the runtime configuration first; the App is imported only afterwards so modules that read it at load see the overrides.
void loadRuntimeConfig().then(async () => {
  // A dynamic import, for the reason above.
  const { default: App } = await import('./App.vue')
  // Mount the application.
  createApp(App).mount('#app')
})
