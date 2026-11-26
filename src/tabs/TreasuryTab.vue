<script setup lang="ts">
// The Treasury tab: the commission rate, the live SUI balance and the treasury address, and the table of community gates the treasury administers
// (found through AdminCap ownership). Related: DaoView.vue (hosts it), composables/ (the reads).
// Vue's `computed`, for the commission label.
import { computed } from 'vue'
// The amount formatter.
import AmountCell from '../components/AmountCell.vue'
// The platform settings.
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
// The treasury balance.
import { useTreasury } from '../composables/useTreasury.js'
// The gates the treasury administers.
import { useGates } from '../composables/useGates.js'
import {
  CopyableAddress,
  ExplorerLink,
  suiExplorerUrl,
  UiPanel,
  UiStatGrid,
  UiStatRow,
  UiDataTable,
} from '@meddleware/ui'
// The network the explorer links point to.
import { explorerNetwork } from '../config.js'

// The platform settings with their state.
const { config, loading: cfgLoading, error: cfgErr } = usePlatformConfig()
// The balance follows the treasury address as soon as it is known.
const { balance } = useTreasury(() => config.value?.treasury ?? null)
// The gates.
const { gates, loading: gatesLoading } = useGates()

// The commission as a percentage, or a dash until known.
const commissionPct = computed(() =>
  config.value ? (config.value.commissionBps / 100).toFixed(2) + '%' : '—',
)

/** A gate's price as text: SUI with four decimals, or more digits for a tiny price. */
function formatPrice(mist: bigint): string {
  // MIST to SUI (one SUI is 10^9 MIST).
  const n = Number(mist) / 1e9
  // Four decimals for ordinary prices; nine, with trailing zeros trimmed, for tiny ones.
  return n >= 0.0001 ? n.toFixed(4) + ' SUI' : n.toFixed(9).replace(/0+$/, '') + ' SUI'
}
</script>

<template>
  <!-- Two panels stacked: the treasury, then its gates. -->
  <div class="dao-stack">
    <!-- The commission, balance and address. -->
    <UiPanel title="Treasury">
      <!-- Shown while the settings load. -->
      <p v-if="cfgLoading" class="dao-muted">Loading…</p>
      <!-- The settings could not be read: a plain sentence. -->
      <p v-else-if="cfgErr" class="dao-muted">{{ cfgErr }}</p>
      <!-- The settings, once read. -->
      <template v-else-if="config">
        <!-- The three figures. -->
        <UiStatGrid class="dao-stat-grid">
          <!-- The rate as a percentage and in basis points. -->
          <UiStatRow label="Commission rate">{{ commissionPct }} ({{ config.commissionBps }} bps)</UiStatRow>
          <!-- The balance in SUI. -->
          <UiStatRow label="Current balance"><AmountCell :mist="balance" /></UiStatRow>
          <!-- The full address with copy and explorer link. -->
          <UiStatRow label="Treasury address" align="left">
            <CopyableAddress :address="config.treasury" :truncate="false">
              <ExplorerLink :href="suiExplorerUrl('account', config.treasury, explorerNetwork)" :value="config.treasury" :truncate="false" />
            </CopyableAddress>
          </UiStatRow>
        </UiStatGrid>
      </template>
      <!-- Nothing read yet and no failure to report. -->
      <p v-else class="dao-muted">PlatformConfig not loaded.</p>
    </UiPanel>

    <!-- The gates whose AdminCaps the treasury owns. -->
    <UiPanel title="Community Gates">
      <!-- Shown while the gates load. -->
      <p v-if="gatesLoading" class="dao-muted">Loading gates…</p>
      <!-- The gate table. -->
      <UiDataTable v-else-if="gates.length" :empty="'No gates found'">
        <template #head>
          <!-- Column headings. -->
          <th>Gate name</th>
          <th>Price</th>
          <th>Object ID</th>
        </template>
        <!-- One row per gate. -->
        <tr v-for="gate in gates" :key="gate.id">
          <td>{{ gate.name }}</td>
          <!-- The price, in the mono face. -->
          <td class="dao-amount">{{ formatPrice(gate.price) }}</td>
          <td class="dao-mono dao-mono--sm dao-nowrap">
            <!-- The gate's object id, copyable and linked to the explorer. -->
            <CopyableAddress :address="gate.id" label="Copy object ID">
              <ExplorerLink :href="suiExplorerUrl('object', gate.id, explorerNetwork)" :value="gate.id" />
            </CopyableAddress>
          </td>
        </tr>
      </UiDataTable>
      <!-- No gates to list. -->
      <p v-else class="dao-placeholder">No gates found.</p>
    </UiPanel>
  </div>
</template>
