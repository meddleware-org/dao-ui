<script setup lang="ts">
import { computed } from 'vue'
import Panel from '../components/Panel.vue'
import AmountCell from '../components/AmountCell.vue'
import DataTable from '../components/DataTable.vue'
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
import { useTreasury } from '../composables/useTreasury.js'
import { useGates } from '../composables/useGates.js'

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

function shortDate(ms: number): string {
  return ms ? new Date(ms).toISOString().slice(0, 10) : '—'
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 10px">
    <Panel title="Commission Configuration">
      <p v-if="cfgLoading" class="dao-muted">Loading…</p>
      <p v-else-if="cfgErr" class="dao-muted">{{ cfgErr }}</p>
      <template v-else-if="config">
        <div class="dao-stat-grid" style="max-width: 480px">
          <span class="dao-stat-grid__label">Commission rate</span>
          <span class="dao-stat-grid__value dao-mono">{{ commissionPct }} ({{ config.commissionBps }} bps)</span>

          <span class="dao-stat-grid__label">Treasury address</span>
          <span class="dao-stat-grid__value dao-mono" style="font-size: 0.72rem; text-align: left; word-break: break-all">
            {{ config.treasury }}
          </span>

          <span class="dao-stat-grid__label">Current balance</span>
          <AmountCell class="dao-stat-grid__value" :mist="balance" />
        </div>
      </template>
      <p v-else class="dao-muted">PlatformConfig not loaded.</p>
    </Panel>

    <Panel title="Fee Distribution">
      <p class="dao-muted" style="margin: 0; font-size: 0.78rem">
        Fee distributor data (buyback/burn ratios, distribution history) will appear here when
        <code>vault_fee_distributor</code> is deployed.
      </p>
    </Panel>

    <Panel title="Community Gates">
      <p v-if="gatesLoading" class="dao-muted">Loading gates…</p>
      <DataTable v-else-if="gates.length" :empty="'No gates found'">
        <template #head>
          <th>Gate name</th>
          <th>Price</th>
          <th>Created</th>
          <th>Object ID</th>
        </template>
        <tr v-for="gate in gates" :key="gate.id">
          <td>{{ gate.name }}</td>
          <td class="dao-amount">{{ formatPrice(gate.price) }}</td>
          <td class="dao-mono" style="font-size: 0.72rem">{{ shortDate(gate.timestampMs) }}</td>
          <td class="dao-mono" style="font-size: 0.7rem">
            {{ gate.id.slice(0, 10) }}…{{ gate.id.slice(-6) }}
          </td>
        </tr>
      </DataTable>
      <p v-else class="dao-placeholder">No gates found.</p>
    </Panel>
  </div>
</template>
