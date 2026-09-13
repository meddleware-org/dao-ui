<script setup lang="ts">
import { computed } from 'vue'
import { NETWORK } from '../config.js'

const props = defineProps<{
  epoch: number | null
  lastRefresh: Date | null
  error?: boolean
}>()

const dotClass = computed(() => (props.error ? 'dao-statusbar__dot--error' : 'dao-statusbar__dot--ok'))

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}
</script>

<template>
  <footer class="dao-statusbar">
    <span class="dao-statusbar__item">
      <span class="dao-statusbar__dot" :class="dotClass" />
      {{ NETWORK.charAt(0).toUpperCase() + NETWORK.slice(1) }}
    </span>
    <span class="dao-statusbar__sep">│</span>
    <span v-if="epoch !== null" class="dao-statusbar__item">Epoch {{ epoch }}</span>
    <span v-else class="dao-statusbar__item dao-muted">Epoch —</span>
    <span class="dao-statusbar__sep">│</span>
    <span v-if="lastRefresh" class="dao-statusbar__item">Refreshed {{ timeAgo(lastRefresh) }}</span>
    <span v-else class="dao-statusbar__item dao-muted">Loading…</span>
  </footer>
</template>
