<script setup lang="ts">
import { computed } from 'vue'
import Panel from '../components/Panel.vue'
import AmountCell from '../components/AmountCell.vue'
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
import { useTreasury } from '../composables/useTreasury.js'
import { useDaoEvents } from '../composables/useDaoEvents.js'
import { useGates } from '../composables/useGates.js'
import { CopyableAddress, ExplorerLink, suiExplorerUrl } from '@meddleware/ui'
import { NETWORK } from '../config.js'
import type { DaoEvent } from '../composables/useDaoEvents.js'

const { config } = usePlatformConfig()
const { balance } = useTreasury(() => config.value?.treasury ?? null)
const { events, loading: eventsLoading } = useDaoEvents(12)
const { gates, loading: gatesLoading } = useGates()

const eventLabel: Record<DaoEvent['type'], string> = {
  AccessMinted: 'Access sold',
  AccessConsumed: 'Access used',
  GateCreated: 'Gate created',
  AccessBurned: 'Access burned',
}

const commissionPct = computed(() =>
  config.value ? (config.value.commissionBps / 100).toFixed(2) + '%' : '—',
)

const accessesMinted = computed(() => events.value.filter((e) => e.type === 'AccessMinted').length)
const accessesConsumed = computed(() => events.value.filter((e) => e.type === 'AccessConsumed').length)
</script>

<template>
  <div class="dao-overview-cols">
    <!-- Left: treasury summary -->
    <div style="display: flex; flex-direction: column; gap: 8px">
      <Panel title="Treasury Balance">
        <div class="dao-stat-grid">
          <span class="dao-stat-grid__label">SUI balance</span>
          <AmountCell class="dao-stat-grid__value" :mist="balance" />

          <span class="dao-stat-grid__label">Commission rate</span>
          <span class="dao-stat-grid__value dao-mono">{{ commissionPct }}</span>

          <span class="dao-stat-grid__label">Treasury address</span>
          <span class="dao-stat-grid__value" style="text-align: left">
            <CopyableAddress v-if="config?.treasury" :address="config.treasury">
              <ExplorerLink :href="suiExplorerUrl('account', config.treasury, NETWORK)" :value="config.treasury" />
            </CopyableAddress>
            <span v-else class="dao-mono" style="font-size: 0.7rem">—</span>
          </span>
        </div>
      </Panel>

      <Panel title="Platform Activity">
        <div class="dao-stat-grid">
          <span class="dao-stat-grid__label">Active gates</span>
          <span class="dao-stat-grid__value dao-mono">{{ gatesLoading ? '…' : gates.length }}</span>

          <span class="dao-stat-grid__label">Accesses minted</span>
          <span class="dao-stat-grid__value dao-mono">{{ accessesMinted || '—' }}</span>

          <span class="dao-stat-grid__label">Accesses consumed</span>
          <span class="dao-stat-grid__value dao-mono">{{ accessesConsumed || '—' }}</span>
        </div>
      </Panel>
    </div>

    <!-- Right: recent activity -->
    <Panel title="Recent Activity">
      <p v-if="eventsLoading" class="dao-muted" style="margin: 0">Loading events…</p>
      <ul v-else-if="events.length" class="dao-feed">
        <li v-for="ev in events" :key="ev.txDigest" class="dao-feed__item">
          <span class="dao-feed__dot" />
          <span class="dao-feed__type">{{ eventLabel[ev.type] }}</span>
          <span class="dao-feed__time">ckpt {{ ev.checkpoint ?? '?' }}</span>
        </li>
      </ul>
      <p v-else class="dao-placeholder">No recent events.</p>
    </Panel>
  </div>
</template>
