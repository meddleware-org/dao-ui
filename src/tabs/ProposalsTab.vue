<script setup lang="ts">
// Proposals tab. Lists proposals via useProposals (currently a stub returning []),
// showing an empty state until the on-chain vault_dao module lands.
import ProposalRow from '../components/ProposalRow.vue'
import { useProposals } from '../composables/useProposals.js'
import { useEpoch } from '../composables/useEpoch.js'

const { proposals } = useProposals()
const { epoch } = useEpoch()
</script>

<template>
  <template v-if="proposals.length > 0">
    <h2 class="dao-section-title">Active &amp; Pending Proposals</h2>
    <ul role="list">
      <li v-for="p in proposals" :key="p.id">
        <ProposalRow :proposal="p" :current-epoch="epoch" />
      </li>
    </ul>
  </template>
  <p v-else class="dao-placeholder">No proposals yet.</p>
</template>
