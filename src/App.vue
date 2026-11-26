<script setup lang="ts">
// The standalone DAO page: the shared page shell (header with the network and the colour-mode control, footer with the documentation links) around the console view.
// The console itself is DaoView.vue (also exported from src/index.ts for the dashboard to embed). Related: src/main.ts mounts this component.
// The shared page shell: header, footer, colour-mode control and the copyright line.
import { AppHeader, AppFooter, ColorModeControl, CopyrightLine, useColorMode } from '@meddleware/ui'
// The active network, shown in the header.
import { network } from './config.js'
// The console itself.
import DaoView from './DaoView.vue'

// The colour mode, dark by default for this console.
const { mode, set } = useColorMode('dark')
// The documentation link in the footer; the build variable overrides the published address.
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://docs.meddleware.co.uk/blockchain/sui/dao/'
// The developer-documentation link in the footer.
const DEV_URL  = import.meta.env.VITE_DEV_URL  || 'https://meddleware.dev/sui/access-gate/'
</script>

<template>
  <!-- The page: header, console, footer in a column. -->
  <div class="app">
    <!-- A dark header, to match the console's desktop-application look. -->
    <AppHeader variant="dark">
      <!-- The page's one h1 is the brand. -->
      <template #brand>
        <h1 class="brand-title">Meddleware DAO</h1>
      </template>
      <!-- The network and the colour-mode control. -->
      <template #actions>
        <!-- The network the page reads. -->
        <span class="network-badge">{{ network }}</span>
        <!-- Light, dark or follow the system. -->
        <ColorModeControl :model-value="mode" @update:model-value="set" />
      </template>
    </AppHeader>

    <!-- The console: overview, treasury, proposals, governance and history tabs. -->
    <DaoView />

    <!-- The footer with the documentation links. -->
    <AppFooter :docs-url="DOCS_URL" :dev-url="DEV_URL">
      <!-- The copyright line. -->
      <template #start>
        <!-- The Kopimi notice, the organisation and the rights statement. -->
        <CopyrightLine symbol-variant="kopimi" organisation-name="Meddleware" rights-statement="jam" />
      </template>
    </AppFooter>
  </div>
</template>

<style scoped>
/* The page fills the window so the footer sits at the bottom. */
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* The h1 looks like the surrounding header text, with no default margin. */
.brand-title {
  font: inherit;
  margin: 0;
}

/* A small outlined label in the mono face, upper-case, using the border and muted tokens. */
.network-badge {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid var(--border);
  color: var(--muted);
  font-family: var(--mw-font-mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
