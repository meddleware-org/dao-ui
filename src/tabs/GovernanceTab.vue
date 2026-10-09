<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ownsPlatformAdminCap } from '@meddleware/access-gate-client'
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
import { useWallet, getSuiClient } from '../wallet.js'
import { explorerNetwork, network, requireDeployment } from '../config.js'
import {
  CopyableAddress,
  ExplorerLink,
  suiExplorerUrl,
  UiPanel,
  UiStatGrid,
  UiStatRow,
} from '@meddleware/ui'

const { config } = usePlatformConfig()
const { account } = useWallet()

const commissionPct = computed(() =>
  config.value ? (config.value.commissionBps / 100).toFixed(2) + '%' : '—',
)

type CapState = 'idle' | 'checking' | 'found' | 'not-found' | 'error'
const capState = ref<CapState>('idle')

let checkGeneration = 0

async function checkCaps(address: string) {
  const mine = ++checkGeneration
  capState.value = 'checking'
  try {
    const owns = await ownsPlatformAdminCap(getSuiClient(), address, requireDeployment().originalId)
    if (mine === checkGeneration) capState.value = owns ? 'found' : 'not-found'
  } catch {
    if (mine === checkGeneration) capState.value = 'error'
  }
}

// Re-check on an account switch and on a network switch (caps are per network).
watch(
  [() => account.value?.address, network],
  ([addr]) => {
    if (addr) void checkCaps(addr)
    else {
      checkGeneration++
      capState.value = 'idle'
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="dao-stack gov">
    <UiPanel title="Platform Parameters">
      <UiStatGrid class="dao-stat-grid">
        <UiStatRow label="Commission rate">{{ commissionPct }}</UiStatRow>
        <UiStatRow label="Max commission cap">10.00% (1000 bps — on-chain hard cap)</UiStatRow>
        <UiStatRow label="Treasury address" align="left">
          <CopyableAddress v-if="config?.treasury" :address="config.treasury" :truncate="false">
            <ExplorerLink :href="suiExplorerUrl('account', config.treasury, explorerNetwork)" :value="config.treasury" :truncate="false" />
          </CopyableAddress>
          <span v-else class="dao-mono dao-mono--sm">—</span>
        </UiStatRow>
      </UiStatGrid>

      <p class="dao-muted gov__footnote">
        Parameters are governed by <code>PlatformAdminCap</code> on-chain.
        Commission is charged on every NFT access purchase:
        <code>commission_bps / 10000 × price</code> routes to treasury;
        the remainder goes to the gate operator.
      </p>
    </UiPanel>

    <UiPanel title="Admin Actions">
      <!-- Not connected -->
      <template v-if="!account">
        <p class="dao-muted">
          Connect a wallet via the header to manage platform settings.
        </p>
      </template>

      <!-- Connected, checking -->
      <template v-else-if="capState === 'checking'">
        <p class="dao-muted">
          Checking capabilities for {{ account.address.slice(0, 10) }}…
        </p>
      </template>

      <!-- Connected, has PlatformAdminCap -->
      <template v-else-if="capState === 'found'">
        <p class="dao-muted">
          <span class="gov__ok" aria-hidden="true">●</span>
          <code>PlatformAdminCap</code> detected. Admin controls will appear here when implemented.
        </p>
      </template>

      <!-- Connected, no cap -->
      <template v-else-if="capState === 'not-found'">
        <p class="dao-muted">
          <span aria-hidden="true">●</span>
          Connected: {{ account.address.slice(0, 10) }}…{{ account.address.slice(-6) }}<br />
          This wallet does not hold <code>PlatformAdminCap</code> or <code>DaoAdminCap</code>.
          Privileged actions are not available.
        </p>
      </template>

      <!-- Error -->
      <template v-else-if="capState === 'error'">
        <p class="dao-muted">
          Unable to verify capabilities. Check your connection and try again.
        </p>
      </template>
    </UiPanel>
  </div>
</template>

<style scoped>
.gov p {
  margin: 0;
}
.gov .gov__footnote {
  margin-top: 10px;
  font-size: 0.72rem;
}
.gov__ok {
  color: var(--ok);
}
</style>
