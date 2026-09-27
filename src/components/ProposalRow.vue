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
  <UiPanel class="proposal">
    <header class="proposal__head">
      <UiBadge :variant="badgeVariant">{{ proposal.status }}</UiBadge>
      <h3 class="proposal__title">{{ proposal.title }}</h3>
      <small class="proposal__epochs">
        <template v-if="epochsLeft !== null && epochsLeft > 0">{{ epochsLeft }} epochs left</template>
        <template v-else-if="epochsLeft !== null && epochsLeft <= 0">Expired</template>
      </small>
    </header>

    <p class="dao-muted proposal__desc">{{ proposal.description }}</p>

    <progress class="dao-progress" :value="pct" max="100" aria-label="Funding progress">{{ pct }}%</progress>
    <p class="proposal__totals">
      <span>{{ formatSui(proposal.contributedMist) }} SUI raised</span>
      <span>{{ pct }}% of {{ formatSui(proposal.targetMist) }} SUI target</span>
    </p>

    <UiToolbarButton disabled title="Vault DAO governance module launching soon" class="proposal__contribute">
      Contribute
    </UiToolbarButton>
  </UiPanel>
</template>

<style scoped>
.proposal {
  margin-bottom: 8px;
}
.proposal__head {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;
}
.proposal__title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
}
.proposal__epochs {
  margin-inline-start: auto;
  padding-inline-start: 8px;
  white-space: nowrap;
  font-family: var(--mw-font-mono);
  font-size: 0.75rem;
  color: var(--muted);
}
.proposal__desc {
  margin: 0 0 8px;
}
.proposal__totals {
  display: flex;
  justify-content: space-between;
  margin: 2px 0 4px;
  font-size: 0.72rem;
  color: var(--muted);
  font-family: var(--mw-font-mono);
}
.proposal__contribute {
  margin-top: 6px;
}
</style>
