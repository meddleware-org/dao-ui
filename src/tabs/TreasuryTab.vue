<script setup lang="ts">
import { computed } from 'vue'
import Panel from '../components/Panel.vue'
import AmountCell from '../components/AmountCell.vue'
import DataTable from '../components/DataTable.vue'
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
import { useTreasury } from '../composables/useTreasury.js'
import { useGates } from '../composables/useGates.js'
import { CopyableAddress, ExplorerLink, suiExplorerUrl } from '@meddleware/ui'
import { NETWORK } from '../config.js'

const { config, loading: cfgLoading, error: cfgErr } = usePlatformConfig()
const { balance } = useTreasury(() => config.value?.treasury ?? null)
const { gates, loading: gatesLoading } = useGates()

const commissionPct = computed(() =>
  config.value ? (config.value.commissionBps / 100).toFixed(2) + '%' : '—',
)

function formatPrice(mist: bigint): string {
  const n = Number(mist) / 1e9
  return n >= 0.0001 ? n.toFixed(4) + ' SUI' : n.toFixed(9).replace(/0+$/, '') + ' SUI'
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 10px">
    <Panel title="Treasury">
      <p v-if="cfgLoading" class="dao-muted">Loading…</p>
      <p v-else-if="cfgErr" class="dao-muted">{{ cfgErr }}</p>
      <template v-else-if="config">
        <div class="dao-stat-grid" style="max-width: 480px">
          <span class="dao-stat-grid__label">Commission rate</span>
          <span class="dao-stat-grid__value dao-mono">{{ commissionPct }} ({{ config.commissionBps }} bps)</span>

          <span class="dao-stat-grid__label">Current balance</span>
          <AmountCell class="dao-stat-grid__value" :mist="balance" />

          <span class="dao-stat-grid__label">Treasury address</span>
          <span class="dao-stat-grid__value" style="text-align: left">
            <CopyableAddress :address="config.treasury">
              <ExplorerLink :href="suiExplorerUrl('account', config.treasury, NETWORK)" :value="config.treasury" />
            </CopyableAddress>
          </span>
        </div>
      </template>
      <p v-else class="dao-muted">PlatformConfig not loaded.</p>
    </Panel>

    <Panel title="Community Gates">
      <p v-if="gatesLoading" class="dao-muted">Loading gates…</p>
      <DataTable v-else-if="gates.length" :empty="'No gates found'">
        <template #head>
          <th>Gate name</th>
          <th>Price</th>
          <th>Object ID</th>
        </template>
        <tr v-for="gate in gates" :key="gate.id">
          <td>{{ gate.name }}</td>
          <td class="dao-amount">{{ formatPrice(gate.price) }}</td>
          <td class="dao-mono" style="font-size: 0.7rem; white-space: nowrap">
            <CopyableAddress :address="gate.id" label="Copy object ID">
              <ExplorerLink :href="suiExplorerUrl('object', gate.id, NETWORK)" :value="gate.id" />
            </CopyableAddress>
          </td>
        </tr>
      </DataTable>
      <p v-else class="dao-placeholder">No gates found.</p>
    </Panel>
  </div>
</template>
