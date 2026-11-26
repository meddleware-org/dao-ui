<script setup lang="ts">
// The Proposals tab: the list of proposals, or an empty state until the vault_dao module ships (composables/useProposals.ts returns an empty list).
// Related: DaoView.vue (hosts it), components/ProposalRow.vue (one proposal).
// One proposal's row.
import ProposalRow from '../components/ProposalRow.vue'
// The proposals (empty until the vault_dao module ships).
import { useProposals } from '../composables/useProposals.js'
// The current epoch, to count the epochs left.
import { useEpoch } from '../composables/useEpoch.js'

// The list.
const { proposals } = useProposals()
// The epoch, or null until known.
const { epoch } = useEpoch()
</script>

<template>
  <!-- With proposals: a heading and the list. -->
  <template v-if="proposals.length > 0">
    <!-- The tab's heading. -->
    <h2 class="dao-section-title">Active &amp; Pending Proposals</h2>
    <!-- The list keeps its list role although the styles remove the bullets. -->
    <ul role="list">
      <!-- One row per proposal. -->
      <li v-for="p in proposals" :key="p.id">
        <ProposalRow :proposal="p" :current-epoch="epoch" />
      </li>
    </ul>
  </template>
  <!-- No proposals yet. -->
  <p v-else class="dao-placeholder">No proposals yet.</p>
</template>
