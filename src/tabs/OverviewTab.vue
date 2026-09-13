<script setup lang="ts">
import { computed } from 'vue'
import Panel from '../components/Panel.vue'
import AmountCell from '../components/AmountCell.vue'
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
import { useTreasury } from '../composables/useTreasury.js'
import { useDaoEvents } from '../composables/useDaoEvents.js'
import type { DaoEvent } from '../composables/useDaoEvents.js'

const { config } = usePlatformConfig()
const { balance } = useTreasury(() => config.value?.treasury ?? null)
const { events, loading: eventsLoading } = useDaoEvents(12)

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

const eventLabel: Record<DaoEvent['type'], string> = {
  AccessMinted: 'Access sold',
  AccessConsumed: 'Access used',
  GateCreated: 'Gate created',
  AccessBurned: 'Access burned',
}

const commissionPct = computed(() =>
  config.value ? (config.value.commissionBps / 100).toFixed(2) + '%' : '—',
)
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
          <span
            class="dao-stat-grid__value dao-mono"
            style="font-size: 0.7rem; word-break: break-all; text-align: left"
            :title="config?.treasury"
          >
            {{ config?.treasury ? config.treasury.slice(0, 10) + '…' + config.treasury.slice(-6) : '—' }}
          </span>
        </div>
      </Panel>

      <Panel title="Platform Stats">
        <div class="dao-stat-grid">
          <span class="dao-stat-grid__label">Strategy NAV</span>
          <span class="dao-stat-grid__value dao-muted">—</span>

          <span class="dao-stat-grid__label">Buyback/burn</span>
          <span class="dao-stat-grid__value dao-muted">—</span>

          <span class="dao-stat-grid__label">Fee distributor</span>
          <span class="dao-stat-grid__value dao-muted">—</span>
        </div>
        <p class="dao-muted" style="margin: 8px 0 0; font-size: 0.72rem">
          Strategy NAV, buyback and fee distribution data will appear here when
          <code>vault_core</code> and <code>vault_fee_distributor</code> are deployed.
        </p>
      </Panel>
    </div>

    <!-- Right: recent activity -->
    <Panel title="Recent Activity">
      <p v-if="eventsLoading" class="dao-muted" style="margin: 0">Loading events…</p>
      <ul v-else-if="events.length" class="dao-feed">
        <li v-for="ev in events" :key="ev.txDigest + ev.timestampMs" class="dao-feed__item">
          <span class="dao-feed__dot" />
          <span class="dao-feed__type">{{ eventLabel[ev.type] }}</span>
          <span class="dao-feed__time">{{ timeAgo(ev.timestampMs) }}</span>
        </li>
      </ul>
      <p v-else class="dao-placeholder">No recent events.</p>
    </Panel>
  </div>
</template>
