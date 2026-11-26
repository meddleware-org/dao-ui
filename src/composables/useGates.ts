// Gates the platform treasury administers: its AdminCaps (resilient to event pruning), each merged
// with its Gate. A gate that cannot be read is left out rather than failing the list.
// Related: chainContext.ts (when to load), TreasuryTab.vue and OverviewTab.vue (the views), availability.ts (the words for a failure).
import { ref } from 'vue'
// The domain client: it parses the chain's objects, so this file does not.
import { fetchAdminCaps, fetchGate, fetchPlatformConfig } from '@meddleware/access-gate-client'
import { getSuiClient } from '../wallet.js'
// The plain words for a failed read.
import { plainFailure } from '../availability.js'
import { requireDeployment } from '../config.js'
import { latest, onChainContext } from './chainContext.js'

/** A gate as the treasury table shows it. */
export interface Gate {
  id: string
  name: string
  price: bigint
  paused: boolean
  frozen: boolean
}

/** The treasury's gates with loading and error state, and a `reload` that reads them again. */
export function useGates() {
  // The gates once read (empty until then, and after a failure).
  const gates = ref<Gate[]>([])
  // True while a read is in flight.
  const loading = ref(false)
  // A plain sentence when the read failed, or null.
  const error = ref<string | null>(null)
  // Starts a read and says whether it is still the newest.
  const begin = latest()

  /** Read the platform's treasury, its AdminCaps and each gate they name. */
  async function load() {
    const current = begin()
    loading.value = true
    error.value = null
    try {
      // The recorded deployment for the active network (throws NotDeployedError where there is none).
      const d = requireDeployment()
      const client = getSuiClient()
      // The treasury address is in the shared PlatformConfig object.
      const { treasury } = await fetchPlatformConfig(client, d.platformConfigId, d.originalId)
      // The AdminCaps the treasury owns, each naming a gate; read from owned objects so event pruning does not matter.
      const caps = await fetchAdminCaps(client, treasury, d.originalId)
      // Read each gate; one that cannot be read must not fail the others, hence `allSettled`.
      const settled = await Promise.allSettled(caps.map((c) => fetchGate(client, c.gateId, d.originalId)))
      // A newer read has begun: this answer is stale.
      if (!current()) return
      // Keep the gates that were read, shaped for the table; an unnamed gate gets a placeholder name.
      gates.value = settled.flatMap((r) =>
        r.status === 'fulfilled' && r.value
          ? [{ id: r.value.gateId, name: r.value.nftName || 'Unnamed Gate', price: r.value.priceMist, paused: r.value.paused, frozen: r.value.frozen }]
          : [],
      )
    } catch (e) {
      if (!current()) return
      // No stale rows after a failure, and plain words for the person (the cause goes to the console).
      gates.value = []
      error.value = plainFailure('the community gates', e)
    } finally {
      // Only the newest read clears the loading flag.
      if (current()) loading.value = false
    }
  }

  // Load on mount and again when the network changes.
  onChainContext(load, () => (gates.value = []))

  return { gates, loading, error, reload: load }
}
