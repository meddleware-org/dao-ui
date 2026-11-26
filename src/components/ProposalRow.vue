<script setup lang="ts">
// One fundraising or governance proposal: status badge, funding progress and epochs left. The Contribute button is disabled until the
// vault_dao module ships. Related: ProposalsTab.vue renders a list of these; composables/useProposals.ts defines the Proposal type.
// Vue's `computed`, for the derived figures.
import { computed } from 'vue'
// The panel, badge and toolbar-button components of the shared UI.
import { UiPanel, UiBadge, UiToolbarButton } from '@meddleware/ui'
// The proposal's shape.
import type { Proposal } from '../composables/useProposals.js'

// The proposal, and the current epoch (null while unknown) to count the epochs left.
const props = defineProps<{
  proposal: Proposal
  currentEpoch: number | null
}>()

// Funding progress as a whole percentage, capped at 100; a zero target shows 0 rather than dividing by zero.
const pct = computed(() => {
  // No target: no progress to show.
  if (props.proposal.targetMist === 0n) return 0
  // BigInt arithmetic keeps the percentage exact before the conversion to a number.
  return Math.min(100, Number((props.proposal.contributedMist * 100n) / props.proposal.targetMist))
})

// Epochs until the proposal ends, or null while the current epoch is unknown.
const epochsLeft = computed(() => {
  if (props.currentEpoch === null) return null
  return props.proposal.endEpoch - props.currentEpoch
})

// The badge variant that matches the proposal's status.
const badgeVariant = computed<'active' | 'pending' | 'closed'>(() => {
  if (props.proposal.status === 'active') return 'active'
  if (props.proposal.status === 'pending') return 'pending'
  return 'closed'
})

/** MIST to SUI with two decimals, for the totals. */
function formatSui(mist: bigint): string {
  const n = Number(mist) / 1e9
  return n.toFixed(2)
}
</script>

<template>
  <!-- One proposal in its own panel. -->
  <UiPanel class="proposal">
    <!-- Status, title and time left on one row. -->
    <header class="proposal__head">
      <!-- The status as a badge. -->
      <UiBadge :variant="badgeVariant">{{ proposal.status }}</UiBadge>
      <!-- The proposal's title. -->
      <h3 class="proposal__title">{{ proposal.title }}</h3>
      <!-- Epochs left, or Expired; nothing while the epoch is unknown. -->
      <small class="proposal__epochs">
        <template v-if="epochsLeft !== null && epochsLeft > 0">{{ epochsLeft }} epochs left</template>
        <template v-else-if="epochsLeft !== null && epochsLeft <= 0">Expired</template>
      </small>
    </header>

    <!-- The description, de-emphasised. -->
    <p class="dao-muted proposal__desc">{{ proposal.description }}</p>

    <!-- Funding progress as a native progress element, with a name for assistive technology and the percentage as its fallback text. -->
    <progress class="dao-progress" :value="pct" max="100" aria-label="Funding progress">{{ pct }}%</progress>
    <!-- The raised amount and the share of the target. -->
    <p class="proposal__totals">
      <span>{{ formatSui(proposal.contributedMist) }} SUI raised</span>
      <span>{{ pct }}% of {{ formatSui(proposal.targetMist) }} SUI target</span>
    </p>

    <!-- Contributing is disabled until the vault_dao module ships; the title says so. -->
    <UiToolbarButton disabled title="Vault DAO governance module launching soon" class="proposal__contribute">
      Contribute
    </UiToolbarButton>
  </UiPanel>
</template>

<style scoped>
/* Space between stacked proposals. */
.proposal {
  margin-bottom: 8px;
}
/* Badge, title and time on one row, aligned at the top. */
.proposal__head {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;
}
/* The title is a heading but looks like bold body text. */
.proposal__title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
}
/* The time left is pushed to the end of the row, mono and muted. */
.proposal__epochs {
  margin-inline-start: auto;
  padding-inline-start: 8px;
  white-space: nowrap;
  font-family: var(--mw-font-mono);
  font-size: 0.75rem;
  color: var(--muted);
}
/* No top margin, a gap before the progress bar. */
.proposal__desc {
  margin: 0 0 8px;
}
/* The two totals at opposite ends of one row, small and mono. */
.proposal__totals {
  display: flex;
  justify-content: space-between;
  margin: 2px 0 4px;
  font-size: 0.72rem;
  color: var(--muted);
  font-family: var(--mw-font-mono);
}
/* A gap above the button. */
.proposal__contribute {
  margin-top: 6px;
}
</style>
