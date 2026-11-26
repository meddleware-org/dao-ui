<script setup lang="ts">
// The History tab: a paginated log of the access_gate events (passes sold and used) with explorer links per row. The list comes from
// composables/useDaoEvents.ts, which tolerates a pruned node history. Related: DaoView.vue (hosts it), OverviewTab.vue (shows the start of the same events).
// Vue's reactivity, for the page number and the page of rows.
import { ref, computed } from 'vue'
// The event feed.
import { useDaoEvents } from '../composables/useDaoEvents.js'
import {
  CopyableAddress,
  ExplorerLink,
  suiExplorerUrl,
  UiDataTable,
  UiBadge,
  UiToolbarButton,
} from '@meddleware/ui'
// The network the explorer links point to.
import { explorerNetwork } from '../config.js'
// The row type.
import type { DaoEvent } from '../composables/useDaoEvents.js'

// The feed: the longest list the console asks for.
const { events, loading, error, reload, indexedFromCheckpoint } = useDaoEvents(200)

// Rows per page.
const PAGE_SIZE = 20
// The page shown, counting from 1.
const page = ref(1)

// The number of pages, at least one.
const totalPages = computed(() => Math.max(1, Math.ceil(events.value.length / PAGE_SIZE)))
// The rows of the current page.
const pageEvents = computed(() =>
  events.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)

// Go back a page, not before the first.
/** Go back a page, not before the first. */
function prevPage() { if (page.value > 1) page.value-- }
// Go forward a page, not past the last.
/** Go forward a page, not past the last. */
function nextPage() { if (page.value < totalPages.value) page.value++ }

// The words for each event type.
const eventLabel: Record<DaoEvent['type'], string> = {
  AccessMinted: 'Access Sold',
  AccessConsumed: 'Access Used',
}

// A sale shows the active badge, a use the closed one.
/** The badge variant for an event type: a sale is `active`, a use is `closed`. */
function badgeVariant(type: DaoEvent['type']): 'active' | 'closed' {
  return type === 'AccessMinted' ? 'active' : 'closed'
}
</script>

<template>
  <header class="history__head">
    <!-- The tab's heading. -->
    <h2 class="dao-section-title">On-Chain Events</h2>
    <!-- Reads the feed again; disabled while loading. -->
    <UiToolbarButton :disabled="loading" @click="reload">
      {{ loading ? 'Loading…' : 'Refresh' }}
    </UiToolbarButton>
  </header>

  <!-- A plain sentence when the events could not be read. -->
  <p v-if="error" class="dao-muted">{{ error }}</p>
  <!-- Shown only when the list came from the indexer, which covers events from a known checkpoint. -->
  <p v-if="indexedFromCheckpoint" class="dao-muted">Indexed since checkpoint {{ indexedFromCheckpoint }}.</p>

  <!-- The event table, shown while loading or when there are rows. -->
  <UiDataTable v-if="pageEvents.length || loading" :empty="'No events'">
    <!-- The column headings; the question marks carry help text in their titles. -->
    <template #head>
      <th>Type</th>
      <th>
        Address
        <!-- Help for the Address column. -->
        <abbr class="dao-info" title="The buyer of a sold pass, or the holder who used one. Click to view in explorer; click the copy icon to copy the full address.">?</abbr>
      </th>
      <th>
        Block
        <!-- Help for the Block column. -->
        <abbr class="dao-info" title="Sui checkpoint sequence number — equivalent to a block height in other blockchains. Each checkpoint finalizes a batch of transactions; higher numbers are more recent.">?</abbr>
      </th>
      <th>
        Transaction
        <!-- Help for the Transaction column. -->
        <abbr class="dao-info" title="Transaction digest — a unique identifier for the transaction that emitted this event. Click to view in explorer; click the copy icon to copy the full digest.">?</abbr>
      </th>
    </template>
    <!-- One row per event. -->
    <tr v-for="ev in pageEvents" :key="ev.txDigest">
      <!-- The kind of event as a badge. -->
      <td><UiBadge :variant="badgeVariant(ev.type)">{{ eventLabel[ev.type] }}</UiBadge></td>
      <td class="dao-mono history__cell history__cell--nowrap">
        <!-- The buyer or the holder, copyable and linked; a dash when the address is missing. -->
        <CopyableAddress v-if="ev.address && ev.address !== 'undefined'" :address="ev.address">
          <ExplorerLink :href="suiExplorerUrl('account', ev.address, explorerNetwork)" :value="ev.address" />
        </CopyableAddress>
        <span v-else>—</span>
      </td>
      <td class="dao-mono history__cell">
        <!-- The checkpoint number, or a dash when unknown. -->
        {{ ev.checkpoint ? '#' + ev.checkpoint : '—' }}
      </td>
      <td class="dao-mono history__cell history__cell--nowrap">
        <!-- The transaction digest, copyable and linked. -->
        <CopyableAddress :address="ev.txDigest" label="Copy transaction">
          <ExplorerLink :href="suiExplorerUrl('txblock', ev.txDigest, explorerNetwork)" :value="ev.txDigest" />
        </CopyableAddress>
      </td>
    </tr>
  </UiDataTable>
  <!-- Nothing to list and nothing loading. -->
  <p v-else-if="!loading" class="dao-placeholder">No events found.</p>

  <!-- Previous and next, shown only when there is more than one page; the label names it for assistive technology. -->
  <nav v-if="totalPages > 1" class="dao-pagination" aria-label="Event pages">
    <UiToolbarButton :disabled="page === 1" @click="prevPage">← Prev</UiToolbarButton>
    <span class="dao-muted">Page {{ page }} / {{ totalPages }}</span>
    <UiToolbarButton :disabled="page === totalPages" @click="nextPage">Next →</UiToolbarButton>
  </nav>
</template>

<style scoped>
/* The heading row: heading at the start, button at the end. */
.history__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
/* No margin on the heading inside the row. */
.history__head .dao-section-title {
  margin: 0;
}
/* Small cell text. */
.history__cell {
  font-size: 0.72rem;
}
/* Addresses and digests never wrap. */
.history__cell--nowrap {
  white-space: nowrap;
}
</style>
