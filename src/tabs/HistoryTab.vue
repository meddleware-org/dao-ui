<script setup lang="ts">
// History tab: paginated on-chain access-gate event log (sold / used / burned) with
// per-row explorer links. Data comes from useDaoEvents (pruning-tolerant, merged feed).
import { ref, computed } from 'vue'
import DataTable from '../components/DataTable.vue'
import { useDaoEvents } from '../composables/useDaoEvents.js'
import { CopyableAddress, ExplorerLink, suiExplorerUrl } from '@meddleware/ui'
import { NETWORK } from '../config.js'
import type { DaoEvent } from '../composables/useDaoEvents.js'

const { events, loading, error, reload } = useDaoEvents(200)

const PAGE_SIZE = 20
const page = ref(1)

const totalPages = computed(() => Math.max(1, Math.ceil(events.value.length / PAGE_SIZE)))
const pageEvents = computed(() =>
  events.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)

function prevPage() { if (page.value > 1) page.value-- }
function nextPage() { if (page.value < totalPages.value) page.value++ }

const eventLabel: Record<DaoEvent['type'], string> = {
  AccessMinted: 'Access Sold',
  AccessConsumed: 'Access Used',
  AccessBurned: 'Access Burned',
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

    <DataTable v-if="pageEvents.length || loading" :empty="'No events'">
      <template #head>
        <th>Type</th>
        <th>
          Address
          <abbr class="dao-info" title="The wallet address associated with this event (recipient, creator, or initiator depending on event type). Click to view in explorer; click the copy icon to copy the full address.">?</abbr>
        </th>
        <th>
          Block
          <abbr class="dao-info" title="Sui checkpoint sequence number — equivalent to a block height in other blockchains. Each checkpoint finalizes a batch of transactions; higher numbers are more recent.">?</abbr>
        </th>
        <th>
          Transaction
          <abbr class="dao-info" title="Transaction digest — a unique identifier for the transaction that emitted this event. Click to view in explorer; click the copy icon to copy the full digest.">?</abbr>
        </th>
      </template>
      <tr v-for="ev in pageEvents" :key="ev.txDigest">
        <td>
          <span
            class="dao-badge"
            :class="{
              'dao-badge--active': ev.type === 'AccessMinted',
              'dao-badge--closed': ev.type === 'AccessConsumed' || ev.type === 'AccessBurned',
            }"
          >{{ eventLabel[ev.type] }}</span>
        </td>
        <td class="dao-mono" style="font-size: 0.72rem; white-space: nowrap">
          <CopyableAddress v-if="ev.address && ev.address !== 'undefined'" :address="ev.address">
            <ExplorerLink :href="suiExplorerUrl('account', ev.address, NETWORK)" :value="ev.address" />
          </CopyableAddress>
          <span v-else>—</span>
        </td>
        <td class="dao-mono" style="font-size: 0.72rem">
          {{ ev.checkpoint ? '#' + ev.checkpoint : '—' }}
        </td>
        <td class="dao-mono" style="font-size: 0.72rem; white-space: nowrap">
          <CopyableAddress :address="ev.txDigest" label="Copy transaction">
            <ExplorerLink :href="suiExplorerUrl('txblock', ev.txDigest, NETWORK)" :value="ev.txDigest" />
          </CopyableAddress>
        </td>
      </tr>
    </DataTable>
    <p v-else-if="!loading" class="dao-placeholder">No events found.</p>

    <div v-if="totalPages > 1" class="dao-pagination">
      <button class="dao-toolbar__btn" :disabled="page === 1" @click="prevPage">← Prev</button>
      <span class="dao-muted" style="font-size: 0.78rem">Page {{ page }} / {{ totalPages }}</span>
      <button class="dao-toolbar__btn" :disabled="page === totalPages" @click="nextPage">Next →</button>
    </div>
  </div>
</template>
