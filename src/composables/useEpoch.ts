import { ref, onMounted } from 'vue'
import { getSuiClient } from '../wallet.js'

export function useEpoch() {
  const epoch = ref<number | null>(null)

  async function load() {
    try {
      const client = getSuiClient()
      const res = await client.getCurrentSystemState()
      epoch.value = Number(res.systemState.epoch)
    } catch {
      // non-fatal — status bar shows "Epoch —"
    }
  }

  onMounted(load)

  return { epoch, reload: load }
}
