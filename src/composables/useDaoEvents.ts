// Recent access_gate mints and consumes, newest first, typed by @meddleware/access-gate-client.
// Read from the indexer when VITE_INDEXER_URL is set (display data; falls back to the full node).
// Related: chainContext.ts (when to load), HistoryTab.vue and OverviewTab.vue (the views), availability.ts (the words for a failure).
import { ref } from 'vue'
// The domain client lists and decodes the events; `isEventHistoryPruned` recognises a node that no longer keeps events this old.
import { isEventHistoryPruned, listAccessGateEvents, type EventCursor } from '@meddleware/access-gate-client'
import { getSuiClient } from '../wallet.js'
// The plain words for any other failed read.
import { plainFailure } from '../availability.js'
import { INDEXER_URL, network, requireDeployment } from '../config.js'
import { latest, onChainContext } from './chainContext.js'

/** What the person reads when the network no longer keeps events this old and the index could not supply them. */
export const HISTORY_PRUNED = 'Older activity cannot be shown right now. Try again later.'

/** One row of the activity list. */
export interface DaoEvent {
  type: 'AccessMinted' | 'AccessConsumed'
  txDigest: string
  checkpoint: string | null
  /** The buyer (or airdrop recipient) of a mint; the NFT owner who spent a use. */
  address: string
}

/** The latest `limit` events (newest first) with loading and error state, and a `reload` that reads them again. */
export function useDaoEvents(limit = 20) {
  // The merged list.
  const events = ref<DaoEvent[]>([])
  // True while a read is in flight.
  const loading = ref(false)
  // A plain sentence when the read failed, or null.
  const error = ref<string | null>(null)
  // When the list was last read successfully (shown in the status bar).
  const lastRefresh = ref<Date | null>(null)
  /** Oldest checkpoint the indexer covers, when the list came from it. */
  const indexedFromCheckpoint = ref<string | null>(null)
  // Starts a read and says whether it is still the newest.
  const begin = latest()

  /** Read pages of mints and consumes until `limit` events are collected or the history ends. */
  async function load() {
    const current = begin()
    loading.value = true
    error.value = null
    try {
      // The recorded deployment (throws NotDeployedError where there is none).
      const d = requireDeployment()
      // The events collected across pages.
      const out: DaoEvent[] = []
      // Where the next page starts (null before the first and after the last).
      let cursor: EventCursor | null = null
      // The oldest checkpoint the indexer reported.
      let from: string | null = null
      // Bounded: each call scans at most a few full-node pages; ten calls cover any realistic limit.
      for (let calls = 0; calls < 10; calls++) {
        // One page; the client uses the indexer when a URL is given and otherwise (or on its failure) the node.
        const page = await listAccessGateEvents(getSuiClient(), {
          originalId: d.originalId,
          kinds: ['AccessMinted', 'AccessConsumed'],
          limit: Math.min(100, limit - out.length),
          cursor,
          indexer: INDEXER_URL ? { url: INDEXER_URL, network: network.value } : undefined,
        })
        // Map each event to the row shown: a mint names its recipient, a consume the NFT owner who spent a use.
        for (const e of page.events) {
          if (e.kind === 'AccessMinted') out.push({ type: e.kind, txDigest: e.txDigest, checkpoint: e.checkpoint, address: e.recipient })
          else if (e.kind === 'AccessConsumed') out.push({ type: e.kind, txDigest: e.txDigest, checkpoint: e.checkpoint, address: e.consumer })
        }
        // Keep the first non-null value the pages report, and move on to the next page.
        from = page.indexedFromCheckpoint ?? from
        cursor = page.cursor
        // Stop at the end of the history or when the limit is reached.
        if (!cursor || out.length >= limit) break
      }
      // A newer read has begun: this answer is stale.
      if (!current()) return
      // Trim to the limit (the last page may overshoot).
      events.value = out.slice(0, limit)
      indexedFromCheckpoint.value = from
      lastRefresh.value = new Date()
    } catch (e) {
      if (!current()) return
      if (isEventHistoryPruned(e)) {
        // A node that has pruned the history asked for is a known condition: the person reads plain words, the node's answer goes to the console.
        console.warn('dao-ui: the node has pruned the event history', (e as { cause?: unknown }).cause ?? e)
        error.value = HISTORY_PRUNED
      } else error.value = plainFailure('the activity', e)
    } finally {
      // Only the newest read clears the loading flag.
      if (current()) loading.value = false
    }
  }

  // Load on mount and again when the network changes, with the previous network's rows cleared first.
  onChainContext(load, () => {
    events.value = []
    indexedFromCheckpoint.value = null
  })

  return { events, loading, error, lastRefresh, indexedFromCheckpoint, reload: load }
}
