// Recent access_gate mints and consumes, newest first, typed by @meddleware/access-gate-client.
// Read from the indexer when VITE_INDEXER_URL is set (display data; falls back to the full node).
import { ref } from 'vue'
import { isEventHistoryPruned, listAccessGateEvents, type EventCursor } from '@meddleware/access-gate-client'
import { getSuiClient } from '../wallet.js'
import { INDEXER_URL, network, requireDeployment } from '../config.js'
import { latest, onChainContext } from './chainContext.js'

/** What the person reads when the network no longer keeps events this old and the index could not supply them. */
export const HISTORY_PRUNED = 'Older activity cannot be shown right now. Try again later.'

export interface DaoEvent {
  type: 'AccessMinted' | 'AccessConsumed'
  txDigest: string
  checkpoint: string | null
  /** The buyer (or airdrop recipient) of a mint; the NFT owner who spent a use. */
  address: string
}

export function useDaoEvents(limit = 20) {
  const events = ref<DaoEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastRefresh = ref<Date | null>(null)
  /** Oldest checkpoint the indexer covers, when the list came from it. */
  const indexedFromCheckpoint = ref<string | null>(null)
  const begin = latest()

  async function load() {
    const current = begin()
    loading.value = true
    error.value = null
    try {
      const d = requireDeployment()
      const out: DaoEvent[] = []
      let cursor: EventCursor | null = null
      let from: string | null = null
      // Bounded: each call scans at most a few full-node pages; ten calls cover any realistic limit.
      for (let calls = 0; calls < 10; calls++) {
        const page = await listAccessGateEvents(getSuiClient(), {
          originalId: d.originalId,
          kinds: ['AccessMinted', 'AccessConsumed'],
          limit: Math.min(100, limit - out.length),
          cursor,
          indexer: INDEXER_URL ? { url: INDEXER_URL, network: network.value } : undefined,
        })
        for (const e of page.events) {
          if (e.kind === 'AccessMinted') out.push({ type: e.kind, txDigest: e.txDigest, checkpoint: e.checkpoint, address: e.recipient })
          else if (e.kind === 'AccessConsumed') out.push({ type: e.kind, txDigest: e.txDigest, checkpoint: e.checkpoint, address: e.consumer })
        }
        from = page.indexedFromCheckpoint ?? from
        cursor = page.cursor
        if (!cursor || out.length >= limit) break
      }
      if (!current()) return
      events.value = out.slice(0, limit)
      indexedFromCheckpoint.value = from
      lastRefresh.value = new Date()
    } catch (e) {
      if (!current()) return
      if (isEventHistoryPruned(e)) {
        // A node that has pruned the history asked for is a known condition: the person reads plain words, the node's answer goes to the console.
        console.warn('dao-ui: the node has pruned the event history', (e as { cause?: unknown }).cause ?? e)
        error.value = HISTORY_PRUNED
      } else error.value = e instanceof Error ? e.message : String(e)
    } finally {
      if (current()) loading.value = false
    }
  }

  onChainContext(load, () => {
    events.value = []
    indexedFromCheckpoint.value = null
  })

  return { events, loading, error, lastRefresh, indexedFromCheckpoint, reload: load }
}
