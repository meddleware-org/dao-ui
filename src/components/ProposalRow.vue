<script setup lang="ts">
// Renders one fundraising/governance proposal: status badge, progress toward target,
// and epochs-left. The Contribute button is disabled until the vault_dao module ships.
import { computed } from 'vue'
import { UiPanel, UiBadge, UiToolbarButton } from '@meddleware/ui'
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

const badgeVariant = computed<'active' | 'pending' | 'closed'>(() => {
  if (props.proposal.status === 'active') return 'active'
  if (props.proposal.status === 'pending') return 'pending'
  return 'closed'
})

function formatSui(mist: bigint): string {
  const n = Number(mist) / 1e9
  return n.toFixed(2)
}
</script>

<template>
  <UiPanel style="margin-bottom: 8px">
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px">
      <div>
        <UiBadge :variant="badgeVariant" style="margin-right: 6px">{{ proposal.status }}</UiBadge>
        <strong style="font-size: 0.85rem">{{ proposal.title }}</strong>
      </div>
      <span class="dao-muted" style="white-space: nowrap; font-family: var(--mw-font-mono); font-size: 0.75rem">
        <template v-if="epochsLeft !== null && epochsLeft > 0">{{ epochsLeft }} epochs left</template>
        <template v-else-if="epochsLeft !== null && epochsLeft <= 0">Expired</template>
      </span>
    </div>

    <p class="dao-muted" style="margin: 0 0 8px; font-size: 0.78rem">{{ proposal.description }}</p>

    <div style="margin-bottom: 4px">
      <div class="dao-progress">
        <div class="dao-progress__fill" :style="{ width: `${pct}%` }" />
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--muted); font-family: var(--mw-font-mono); margin-top: 2px">
        <span>{{ formatSui(proposal.contributedMist) }} SUI raised</span>
        <span>{{ pct }}% of {{ formatSui(proposal.targetMist) }} SUI target</span>
      </div>
    </div>

    <UiToolbarButton
      disabled
      title="Vault DAO governance module launching soon"
      style="margin-top: 6px; opacity: 0.5; cursor: not-allowed"
    >
      Contribute
    </UiToolbarButton>
  </UiPanel>
</template>
