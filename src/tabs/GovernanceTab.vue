<script setup lang="ts">
// The Governance tab: the platform's commission parameters, and the admin actions the connected wallet may take (today only detection of the PlatformAdminCap;
// the controls arrive with the vault_dao module). Related: DaoView.vue (hosts it), tests/governance-tab.test.ts (keeps the commission text and the capability check honest).
// Vue's reactivity, for the capability state and the formatted figures.
import { ref, watch, computed } from 'vue'
// The domain client's check for the PlatformAdminCap: it looks for that one capability and nothing else.
import { ownsPlatformAdminCap } from '@meddleware/access-gate-client'
// The platform settings (commission and treasury).
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
// The shared wallet account (read-only here) and the read client.
import { useWallet, getSuiClient } from '../wallet.js'
// The network, the explorer's network and the recorded deployment.
import { explorerNetwork, network, requireDeployment } from '../config.js'
import {
  CopyableAddress,
  ExplorerLink,
  suiExplorerUrl,
  UiPanel,
  UiStatGrid,
  UiStatRow,
} from '@meddleware/ui'

// The platform settings, once read.
const { config } = usePlatformConfig()
// The connected wallet account, or null.
const { account } = useWallet()

// The commission as a percentage, or a dash until known.
const commissionPct = computed(() =>
  config.value ? (config.value.commissionBps / 100).toFixed(2) + '%' : '—',
)

// Display only: the exact figure in MIST is shown beside it, and the contract enforces the rule.
// The minimum commission, in MIST with the SUI equivalent beside it.
const minCommission = computed(() => {
  // Nothing to show until the settings are read.
  if (!config.value) return '—'
  // The floor in MIST.
  const mist = config.value.minCommissionMist
  // MIST exactly, then SUI for readers.
  return `${mist.toString()} MIST (${(Number(mist) / 1e9).toString()} SUI)`
})

// The capability check's states.
/** The capability check's states. */
type CapState = 'idle' | 'checking' | 'found' | 'not-found' | 'error'
// Where the check stands.
const capState = ref<CapState>('idle')

// Numbers each check so a slower, older one cannot overwrite a newer.
let checkGeneration = 0

// Ask the chain whether `address` holds the PlatformAdminCap.
/** Ask the chain whether `address` holds the PlatformAdminCap and record the answer unless a newer check began. */
async function checkCaps(address: string) {
  // This check's number.
  const mine = ++checkGeneration
  // Show that the check is running.
  capState.value = 'checking'
  try {
    // The domain client does the read; the app only reads the answer.
    const owns = await ownsPlatformAdminCap(getSuiClient(), address, requireDeployment().originalId)
    // Keep the answer only if no newer check began.
    if (mine === checkGeneration) capState.value = owns ? 'found' : 'not-found'
  // Any failure: say so without naming the cause (no raw error text is shown).
  } catch {
    // Same guard: a stale failure is dropped.
    if (mine === checkGeneration) capState.value = 'error'
  }
}

// Re-check on an account switch and on a network switch (caps are per network).
// Re-check when the account or the network changes (immediately too, in case a wallet is already connected).
watch(
  [() => account.value?.address, network],
  ([addr]) => {
    // An account: check it.
    if (addr) void checkCaps(addr)
    else {
      // No account: cancel any check in flight.
      checkGeneration++
      // Back to the not-connected state.
      capState.value = 'idle'
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="dao-stack gov">
    <!-- The commission rules the contract enforces. -->
    <UiPanel title="Platform Parameters">
      <!-- The four parameters as label and value rows. -->
      <UiStatGrid class="dao-stat-grid">
        <!-- The current rate as a percentage. -->
        <UiStatRow label="Commission rate">{{ commissionPct }}</UiStatRow>
        <!-- The floor the contract applies to a paid purchase. -->
        <UiStatRow label="Minimum commission">{{ minCommission }}</UiStatRow>
        <!-- The cap is a constant in the contract, written here as a fact. -->
        <UiStatRow label="Max commission cap">10.00% (1000 bps — on-chain hard cap)</UiStatRow>
        <!-- The treasury address with copy and explorer link, or a dash until known. -->
        <UiStatRow label="Treasury address" align="left">
          <CopyableAddress v-if="config?.treasury" :address="config.treasury" :truncate="false">
            <ExplorerLink :href="suiExplorerUrl('account', config.treasury, explorerNetwork)" :value="config.treasury" :truncate="false" />
          </CopyableAddress>
          <span v-else class="dao-mono dao-mono--sm">—</span>
        </UiStatRow>
      </UiStatGrid>

      <!-- The rule in words, matching the contract (tests/governance-tab.test.ts keeps it honest). -->
      <p class="dao-muted gov__footnote">
        Parameters are governed by <code>PlatformAdminCap</code> on-chain.
        Commission is charged on every paid NFT access purchase:
        <code>max(price × commission_bps / 10000, minimum commission)</code>, never more than
        10% of the price, routes to treasury; the remainder goes to the gate operator. A gate that
        locked its commission terms when it was frozen keeps those terms.
      </p>
    </UiPanel>

    <!-- What the connected wallet may do. -->
    <UiPanel title="Admin Actions">
      <!-- No wallet connected: say how to connect. -->
      <template v-if="!account">
        <p class="dao-muted">
          Connect a wallet via the header to manage platform settings.
        </p>
      </template>

      <!-- The check is running. -->
      <template v-else-if="capState === 'checking'">
        <p class="dao-muted">
          Checking capabilities for {{ account.address.slice(0, 10) }}…
        </p>
      </template>

      <!-- The wallet holds the capability; the controls arrive with the vault_dao module. -->
      <template v-else-if="capState === 'found'">
        <p class="dao-muted">
          <span class="gov__ok" aria-hidden="true">●</span>
          <code>PlatformAdminCap</code> detected. Admin controls will appear here when implemented.
        </p>
      </template>

      <!-- The wallet is connected but has no capability, so privileged actions are not offered. -->
      <template v-else-if="capState === 'not-found'">
        <p class="dao-muted">
          <span aria-hidden="true">●</span>
          Connected: {{ account.address.slice(0, 10) }}…{{ account.address.slice(-6) }}<br />
          This wallet does not hold <code>PlatformAdminCap</code>.
          Privileged actions are not available.
        </p>
      </template>

      <!-- The check failed; ask for another try. -->
      <template v-else-if="capState === 'error'">
        <p class="dao-muted">
          Unable to verify capabilities. Check your connection and try again.
        </p>
      </template>
    </UiPanel>
  </div>
</template>

<style scoped>
/* Paragraphs in this tab have no default margin. */
.gov p {
  margin: 0;
}
/* The footnote has a gap above and a small size. */
.gov .gov__footnote {
  margin-top: 10px;
  font-size: 0.72rem;
}
/* The detected-capability marker uses the ok colour. */
.gov__ok {
  color: var(--ok);
}
</style>
