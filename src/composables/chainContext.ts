// Helpers shared by the console's composables: when to load (on mount and on a network change) and how to drop a stale answer.
// Related: useDaoEvents.ts, useEpoch.ts, useGates.ts, usePlatformConfig.ts and useTreasury.ts use them.
// Vue hooks: `getCurrentInstance` tells whether this runs inside a component, `onMounted` and `watch` start and restart the load.
import { getCurrentInstance, onMounted, watch } from 'vue'
// The active network, which decides when loaded data is stale.
import { network } from '../config.js'

/**
 * Load on mount and again whenever the network changes, clearing the previous network's data
 * first. Only inside a component (unit tests call `reload()` directly).
 *
 * @param load - fetches the data
 * @param reset - empties what the view shows (called when the network changes, before the new load)
 */
export function onChainContext(load: () => Promise<void>, reset: () => void): void {
  // Outside a component there is nothing to hook into; a unit test calls `reload()` itself.
  if (!getCurrentInstance()) return
  // Load when the component mounts.
  onMounted(load)
  // When the network changes: forget the old data, then load for the new network.
  watch(network, () => {
    reset()
    void load()
  })
}

/**
 * A guard against a slower, older load overwriting a newer one.
 *
 * @returns a function that starts a load and returns a `current()` check: true until a newer load begins
 */
export function latest(): () => () => boolean {
  // The number of the newest load begun.
  let generation = 0
  return () => {
    // This load's number.
    const mine = ++generation
    // It is current only while no newer load has taken the next number.
    return () => mine === generation
  }
}
