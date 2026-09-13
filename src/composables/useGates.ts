import { ref, onMounted } from 'vue'
import { getSuiClient } from '../wallet.js'
import { PACKAGE_ID } from '../config.js'

export interface Gate {
  id: string
  name: string
  price: bigint
  paused: boolean
  frozen: boolean
  txDigest: string
  timestampMs: number
}

export function useGates() {
  const gates = ref<Gate[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    if (!PACKAGE_ID) return
    loading.value = true
    error.value = null
    try {
      const client = getSuiClient()
      const events = await client.listEvents({
        filter: { eventType: `${PACKAGE_ID}::access_gate::GateCreatedEvent` },
        limit: 50,
        order: 'descending',
      })
      gates.value = events.events.map((e) => {
        const f = (e.json ?? {}) as Record<string, unknown>
        return {
          id: String(f.gate_id ?? ''),
          name: String(f.nft_name ?? 'Unnamed Gate'),
          price: BigInt(String(f.price ?? '0')),
          paused: false,
          frozen: false,
          txDigest: e.transactionDigest,
          timestampMs: 0,
        }
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  return { gates, loading, error, reload: load }
}
