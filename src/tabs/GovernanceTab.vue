<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Panel from '../components/Panel.vue'
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
import { useWallet, getSuiClient } from '../wallet.js'
import { PACKAGE_ID } from '../config.js'
import { CopyableAddress, ExplorerLink, suiExplorerUrl } from '@meddleware/ui'
import { NETWORK } from '../config.js'

const { config } = usePlatformConfig()
const { account } = useWallet()

const commissionPct = computed(() =>
  config.value ? (config.value.commissionBps / 100).toFixed(2) + '%' : '—',
)

type CapState = 'idle' | 'checking' | 'found' | 'not-found' | 'error'
const capState = ref<CapState>('idle')

async function checkCaps(address: string) {
  if (!PACKAGE_ID) { capState.value = 'not-found'; return }
  capState.value = 'checking'
  try {
    const client = getSuiClient()
    const res = await client.listOwnedObjects({
      owner: address,
      type: `${PACKAGE_ID}::access_gate::PlatformAdminCap`,
      limit: 1,
    })
    capState.value = res.objects.length > 0 ? 'found' : 'not-found'
  } catch {
    capState.value = 'error'
  }
}

watch(
  () => account.value?.address,
  (addr) => {
    if (addr) void checkCaps(addr)
    else capState.value = 'idle'
  },
  { immediate: true },
)
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 10px">
    <Panel title="Platform Parameters">
      <div class="dao-stat-grid" style="max-width: 480px">
        <span class="dao-stat-grid__label">Commission rate</span>
        <span class="dao-stat-grid__value dao-mono">{{ commissionPct }}</span>

        <span class="dao-stat-grid__label">Max commission cap</span>
        <span class="dao-stat-grid__value dao-mono">10.00% (1000 bps — on-chain hard cap)</span>

        <span class="dao-stat-grid__label">Treasury address</span>
        <span class="dao-stat-grid__value" style="text-align: left">
          <CopyableAddress v-if="config?.treasury" :address="config.treasury">
            <ExplorerLink :href="suiExplorerUrl('account', config.treasury, NETWORK)" :value="config.treasury" />
          </CopyableAddress>
          <span v-else class="dao-mono" style="font-size: 0.7rem">—</span>
        </span>
      </div>

      <p class="dao-muted" style="margin: 10px 0 0; font-size: 0.72rem">
        Parameters are governed by <code>PlatformAdminCap</code> on-chain.
        Commission is charged on every NFT access purchase:
        <code>commission_bps / 10000 × price</code> routes to treasury;
        the remainder goes to the gate operator.
      </p>
    </Panel>

    <Panel title="Admin Actions">
      <!-- Not connected -->
      <template v-if="!account">
        <p class="dao-muted" style="margin: 0; font-size: 0.78rem">
          Connect a wallet via the header to manage platform settings.
        </p>
      </template>

      <!-- Connected, checking -->
      <template v-else-if="capState === 'checking'">
        <p class="dao-muted" style="margin: 0; font-size: 0.78rem">
          Checking capabilities for {{ account.address.slice(0, 10) }}…
        </p>
      </template>

      <!-- Connected, has PlatformAdminCap -->
      <template v-else-if="capState === 'found'">
        <p class="dao-muted" style="margin: 0 0 8px; font-size: 0.78rem">
          <span style="color: var(--ok)">●</span>
          <code>PlatformAdminCap</code> detected. Admin controls will appear here when implemented.
        </p>
      </template>

      <!-- Connected, no cap -->
      <template v-else-if="capState === 'not-found'">
        <p class="dao-muted" style="margin: 0; font-size: 0.78rem">
          <span>●</span>
          Connected: {{ account.address.slice(0, 10) }}…{{ account.address.slice(-6) }}<br>
          This wallet does not hold <code>PlatformAdminCap</code> or <code>DaoAdminCap</code>.
          Privileged actions are not available.
        </p>
      </template>

      <!-- Error -->
      <template v-else-if="capState === 'error'">
        <p class="dao-muted" style="margin: 0; font-size: 0.78rem">
          Unable to verify capabilities. Check your connection and try again.
        </p>
      </template>
    </Panel>
  </div>
</template>
