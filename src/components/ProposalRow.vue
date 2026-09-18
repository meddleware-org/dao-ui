<script setup lang="ts">
// Renders one fundraising/governance proposal: status badge, progress toward target,
// and epochs-left. The Contribute button is disabled until the vault_dao module ships.
import { computed } from 'vue'
import type { Proposal } from '../composables/useProposals.js'

const props = defineProps<{
  proposal: Proposal
  currentEpoch: number | null
}>()

const pct = computed(() => {
  if (props.proposal.targetMist === 0n) return 0
  return Math.min(100, Number((props.proposal.contributedMist * 100n) / props.proposal.targetMist))
})

const epochsLeft = computed(() => {
  if (props.currentEpoch === null) return null
  return props.proposal.endEpoch - props.currentEpoch
})

const statusBadge = computed(() => {
  if (props.proposal.status === 'active') return 'dao-badge--active'
  if (props.proposal.status === 'pending') return 'dao-badge--pending'
  return 'dao-badge--closed'
})

function formatSui(mist: bigint): string {
  const n = Number(mist) / 1e9
  return n.toFixed(2)
}
</script>

<template>
  <div class="dao-panel" style="margin-bottom: 8px">
    <div class="dao-panel__body">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px">
        <div>
          <span :class="['dao-badge', statusBadge]" style="margin-right: 6px">{{ proposal.status }}</span>
          <strong style="font-size: 0.85rem">{{ proposal.title }}</strong>
        </div>
        <span class="dao-muted" style="white-space: nowrap; font-family: var(--font-mono); font-size: 0.75rem">
          <template v-if="epochsLeft !== null && epochsLeft > 0">{{ epochsLeft }} epochs left</template>
          <template v-else-if="epochsLeft !== null && epochsLeft <= 0">Expired</template>
        </span>
      </div>

      <p class="dao-muted" style="margin: 0 0 8px; font-size: 0.78rem">{{ proposal.description }}</p>

      <div style="margin-bottom: 4px">
        <div class="dao-progress">
          <div class="dao-progress__fill" :style="{ width: `${pct}%` }" />
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--muted); font-family: var(--font-mono); margin-top: 2px">
          <span>{{ formatSui(proposal.contributedMist) }} SUI raised</span>
          <span>{{ pct }}% of {{ formatSui(proposal.targetMist) }} SUI target</span>
        </div>
      </div>

      <button
        class="dao-toolbar__btn"
        disabled
        title="Vault DAO governance module launching soon"
        style="margin-top: 6px; opacity: 0.5; cursor: not-allowed"
      >
        Contribute
      </button>
    </div>
  </div>
</template>
