<script setup lang="ts">
import DataTable from '../components/DataTable.vue'
import { useDaoEvents } from '../composables/useDaoEvents.js'
import type { DaoEvent } from '../composables/useDaoEvents.js'

const { events, loading, error, reload } = useDaoEvents(50)

const eventLabel: Record<DaoEvent['type'], string> = {
  AccessMinted: 'Access Sold',
  AccessConsumed: 'Access Used',
  GateCreated: 'Gate Created',
  AccessBurned: 'Access Burned',
}

function shortTs(ms: number): string {
  if (!ms) return '—'
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

function shortAddr(addr: string | undefined): string {
  if (!addr || addr === 'undefined') return '—'
  return addr.slice(0, 10) + '…' + addr.slice(-6)
}

function explorerUrl(digest: string): string {
  return `https://suiscan.xyz/testnet/tx/${digest}`
}
</script>

<template>
  <div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px">
      <p class="dao-section-title" style="margin: 0">On-Chain Events</p>
      <button class="dao-toolbar__btn" :disabled="loading" @click="reload">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" class="dao-muted">{{ error }}</p>

    <DataTable v-if="events.length || loading" :empty="'No events'">
      <template #head>
        <th>Type</th>
        <th>Address</th>
        <th>Time (UTC)</th>
        <th>Tx</th>
      </template>
      <tr v-for="ev in events" :key="ev.txDigest + ev.timestampMs">
        <td>
          <span
            class="dao-badge"
            :class="{
              'dao-badge--active': ev.type === 'AccessMinted',
              'dao-badge--pending': ev.type === 'GateCreated',
              'dao-badge--closed': ev.type === 'AccessConsumed' || ev.type === 'AccessBurned',
            }"
          >{{ eventLabel[ev.type] }}</span>
        </td>
        <td class="dao-mono" style="font-size: 0.72rem">{{ shortAddr(ev.address) }}</td>
        <td class="dao-mono" style="font-size: 0.72rem">{{ shortTs(ev.timestampMs) }}</td>
        <td class="dao-mono" style="font-size: 0.72rem">
          <a :href="explorerUrl(ev.txDigest)" target="_blank" rel="noopener" style="color: var(--accent)">
            {{ ev.txDigest.slice(0, 8) }}…
          </a>
        </td>
      </tr>
    </DataTable>
    <p v-else-if="!loading" class="dao-placeholder">No events found.</p>
  </div>
</template>
