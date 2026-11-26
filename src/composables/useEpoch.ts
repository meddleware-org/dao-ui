// The current Sui epoch, shown in the status bar. A read-only composable: one read of the node's system state, repeated when the
// network changes. Related: chainContext.ts (when to load), DaoView.vue (the status bar that shows it), ProposalsTab.vue (epochs left).
// Vue's reactive reference, for the epoch.
import { ref } from 'vue'
// The chain client for the selected network.
import { getSuiClient } from '../wallet.js'
// When to load, and how to drop a stale answer.
import { latest, onChainContext } from './chainContext.js'

/** The epoch (null until it is known, when the status bar shows a dash) and a `reload` that reads it again. */
export function useEpoch() {
  // The epoch number, or null while unknown.
  const epoch = ref<number | null>(null)
  // Starts a read and says whether it is still the newest.
  const begin = latest()

  /** Read the epoch from the node's system state; a failure leaves it unknown, because the bar is not worth an error message. */
  async function load() {
    const current = begin()
    try {
      const res = await getSuiClient().getCurrentSystemState()
      // Keep the answer only when no newer read has begun.
      if (current()) epoch.value = Number(res.systemState.epoch)
    } catch {
      // non-fatal — status bar shows "Epoch —"
    }
  }

  // Load on mount and again when the network changes, back to unknown first.
  onChainContext(load, () => (epoch.value = null))

  return { epoch, reload: load }
}
