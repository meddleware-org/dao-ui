<script setup lang="ts">
// Standalone shell for the DAO SPA. The core UI lives in DaoView.vue (also exported
// for inline embedding in the dashboard).
import { AppHeader, AppFooter, ColorModeControl, useColorMode } from '@meddleware/ui'
import { NETWORK } from './config.js'
import DaoView from './DaoView.vue'

const { mode, set } = useColorMode('dark')
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://docs.meddleware.co.uk/blockchain/sui/dao/'
const DEV_URL  = import.meta.env.VITE_DEV_URL  || 'https://dev.meddleware.co.uk/sui/dao/'
</script>

<template>
  <div class="app">
    <AppHeader variant="dark">
      <template #brand>
        <h1 class="brand-title">Meddleware DAO</h1>
      </template>
      <template #actions>
        <span class="network-badge">{{ NETWORK }}</span>
        <ColorModeControl :model-value="mode" @update:model-value="set" />
      </template>
    </AppHeader>

    <DaoView style="flex: 1; min-height: 0" />

    <AppFooter :docs-url="DOCS_URL" :dev-url="DEV_URL" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.brand-title {
  font: inherit;
  margin: 0;
}

.network-badge {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid var(--border);
  color: var(--muted);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
