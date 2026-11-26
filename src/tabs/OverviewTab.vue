<script setup lang="ts">
// The Overview tab: treasury balance and commission, counters of what the event feed holds (gates, passes sold and used) and the recent events.
// Related: DaoView.vue (hosts it), composables/ (the reads), HistoryTab.vue (the full list).
// Vue's `computed`, for the labels and counters.
import { computed } from 'vue'
// The amount formatter.
import AmountCell from '../components/AmountCell.vue'
// The platform settings.
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
// The treasury balance.
import { useTreasury } from '../composables/useTreasury.js'
// The event feed.
import { useDaoEvents } from '../composables/useDaoEvents.js'
// The gates the treasury administers.
import { useGates } from '../composables/useGates.js'
import {
  CopyableAddress,
  ExplorerLink,
  suiExplorerUrl,
  UiPanel,
  UiStatGrid,
  UiStatRow,
  UiActivityFeed,
  UiActivityItem,
} from '@meddleware/ui'
// The network the explorer links point to.
import { explorerNetwork } from '../config.js'
// The row type.
import type { DaoEvent } from '../composables/useDaoEvents.js'

// The platform settings.
const { config } = usePlatformConfig()
// The balance follows the treasury address as soon as it is known.
const { balance } = useTreasury(() => config.value?.treasury ?? null)
// The twelve most recent events.
const { events, loading: eventsLoading } = useDaoEvents(12)
// The gates.
const { gates, loading: gatesLoading } = useGates()

// The words for each event type.
const eventLabel: Record<DaoEvent['type'], string> = {
  AccessMinted: 'Access sold',
  AccessConsumed: 'Access used',
}

// The commission as a percentage, or a dash until known.
const commissionPct = computed(() =>
  config.value ? (config.value.commissionBps / 100).toFixed(2) + '%' : '—',
)

// Sales among the events the feed holds.
const accessesMinted = computed(() => events.value.filter((e) => e.type === 'AccessMinted').length)
// Uses among the events the feed holds.
const accessesConsumed = computed(() => events.value.filter((e) => e.type === 'AccessConsumed').length)
</script>

<template>
  <div class="dao-overview-cols">
    <!-- Left: treasury summary -->
    <!-- The left column's two panels. -->
    <div class="dao-stack dao-stack--tight">
      <!-- The balance panel. -->
      <UiPanel title="Treasury Balance">
        <UiStatGrid>
          <!-- The balance in SUI. -->
          <UiStatRow label="SUI balance"><AmountCell :mist="balance" /></UiStatRow>
          <!-- The commission as a percentage. -->
          <UiStatRow label="Commission rate">{{ commissionPct }}</UiStatRow>
          <!-- The address with copy and explorer link, or a dash until known. -->
          <UiStatRow label="Treasury address" align="left">
            <CopyableAddress v-if="config?.treasury" :address="config.treasury" :truncate="false">
              <ExplorerLink :href="suiExplorerUrl('account', config.treasury, explorerNetwork)" :value="config.treasury" :truncate="false" />
            </CopyableAddress>
            <span v-else class="dao-mono dao-mono--sm">—</span>
          </UiStatRow>
        </UiStatGrid>
      </UiPanel>

      <!-- The counters panel. -->
      <UiPanel title="Platform Activity">
        <UiStatGrid>
          <!-- The number of gates, or an ellipsis while loading. -->
          <UiStatRow label="Active gates">{{ gatesLoading ? '…' : gates.length }}</UiStatRow>
          <!-- Passes sold, or a dash when none are in the feed. -->
          <UiStatRow label="Accesses minted">{{ accessesMinted || '—' }}</UiStatRow>
          <!-- Passes used, or a dash when none are in the feed. -->
          <UiStatRow label="Accesses consumed">{{ accessesConsumed || '—' }}</UiStatRow>
        </UiStatGrid>
      </UiPanel>
    </div>

    <!-- Right: recent activity -->
    <!-- The most recent events. -->
    <UiPanel title="Recent Activity">
      <!-- Shown while the events load. -->
      <p v-if="eventsLoading" class="dao-muted dao-flush">Loading events…</p>
      <!-- The list of recent events. -->
      <UiActivityFeed v-else-if="events.length">
        <!-- One event: its kind and the checkpoint it landed in. -->
        <UiActivityItem
          v-for="ev in events"
          :key="ev.txDigest"
          :type="eventLabel[ev.type]"
          :time="`ckpt ${ev.checkpoint ?? '?'}`"
        />
      </UiActivityFeed>
      <!-- No events to show. -->
      <p v-else class="dao-placeholder">No recent events.</p>
    </UiPanel>
  </div>
</template>
