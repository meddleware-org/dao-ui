// Standalone SPA bootstrap. Loads the design-token + ui base stylesheets and the
// console's qt.css, then mounts the App shell. (The library path — src/index.ts —
// bypasses this and relies on DaoView's own scoped qt.css import instead.)
import '@meddleware/design-tokens/tokens.css'
import '@meddleware/ui/base.css'
import './styles/qt.css'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
