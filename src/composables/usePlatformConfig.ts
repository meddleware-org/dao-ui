// Reads the PlatformConfig shared object and exposes the treasury address + commission rate (bps).
// Source of truth for the commission model and for whose AdminCaps the gate discovery looks up.
// Related: chainContext.ts (when to load), the tabs that show it, availability.ts (the words for a failure).
import { ref } from 'vue'
import { fetchPlatformConfig } from '@meddleware/access-gate-client'
import { getSuiClient } from '../wallet.js'
// The plain words for a failed read.
import { plainFailure } from '../availability.js'
import { requireDeployment } from '../config.js'
import { latest, onChainContext } from './chainContext.js'

/** The platform settings the console shows. */
export interface PlatformConfig {
  treasury: string
  commissionBps: number
  /** Floor on a paid purchase's commission, in MIST (the contract pays max(percentage, this), capped at 10%). */
  minCommissionMist: bigint
}

/** The platform settings with loading and error state, and a `reload` that reads them again. */
export function usePlatformConfig() {
  // The settings once read, or null.
  const config = ref<PlatformConfig | null>(null)
  // True while a read is in flight.
  const loading = ref(false)
  // A plain sentence when the read failed, or null.
  const error = ref<string | null>(null)
  // Starts a read and says whether it is still the newest.
  const begin = latest()

  /** Read the PlatformConfig object recorded for the active network. */
  async function load() {
    const current = begin()
    loading.value = true
    error.value = null
    try {
      // The recorded deployment (throws NotDeployedError where there is none).
      const d = requireDeployment()
      // The shared PlatformConfig object: who the treasury is and what commission the platform takes.
      const c = await fetchPlatformConfig(getSuiClient(), d.platformConfigId, d.originalId)
      // A newer read has begun: this answer is stale.
      if (!current()) return
      // The commission is a number of basis points on chain.
      config.value = { treasury: c.treasury, commissionBps: Number(c.commissionBps), minCommissionMist: c.minCommissionMist }
    } catch (e) {
      if (!current()) return
      // No stale settings after a failure, and plain words for the person.
      config.value = null
      error.value = plainFailure('the platform settings', e)
    } finally {
      // Only the newest read clears the loading flag.
      if (current()) loading.value = false
    }
  }

  // Load on mount and again when the network changes.
  onChainContext(load, () => (config.value = null))

  return { config, loading, error, reload: load }
}
