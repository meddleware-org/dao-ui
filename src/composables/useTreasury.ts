// Reads the SUI the treasury address holds: its coin objects plus its address balance (SIP-58), so
// funds sent with `send_funds` are counted. Reactive to the address getter so it refetches when
// usePlatformConfig resolves; clears to null while the address is unknown or unreadable. A slower,
// older read never overwrites a newer one. Related: chainContext.ts (`latest`), availability.ts (the words for a failure).
import { ref, watch } from 'vue'
import { getSuiClient } from '../wallet.js'
// The plain words for a failed read.
import { plainFailure } from '../availability.js'
import { latest } from './chainContext.js'

/** The balance of an address, read from the chain. `treasuryAddress` is a getter so the read follows the address as it becomes known. */
export function useTreasury(treasuryAddress: () => string | null) {
  // The balance in MIST, or null while unknown or unreadable.
  const balance = ref<bigint | null>(null)
  // True while a read is in flight.
  const loading = ref(false)
  // A plain sentence when the read failed, or null.
  const error = ref<string | null>(null)
  // Starts a read and says whether it is still the newest.
  const begin = latest()

  /** Read the balance of `address` and publish it unless a newer read has begun. */
  async function load(address: string) {
    const current = begin()
    loading.value = true
    error.value = null
    try {
      // The core API's balance for the address, which counts coin objects and the address balance together.
      const res = await getSuiClient().core.getBalance({ owner: address, coinType: '0x2::sui::SUI' })
      if (current()) balance.value = BigInt(res.balance.balance)
    } catch (e) {
      // A newer read has begun: this failure is stale.
      if (!current()) return
      // No stale balance after a failure, and plain words for the person.
      balance.value = null
      error.value = plainFailure('the treasury balance', e)
    } finally {
      // Only the newest read clears the loading flag.
      if (current()) loading.value = false
    }
  }

  // Read whenever the address becomes known or changes (immediately too, in case it is already known).
  watch(
    treasuryAddress,
    (addr) => {
      if (addr) {
        void load(addr)
      } else {
        // No address (yet): discard any read in flight and show no balance.
        begin()
        balance.value = null
        loading.value = false
      }
    },
    { immediate: true },
  )

  return { balance, loading, error }
}
