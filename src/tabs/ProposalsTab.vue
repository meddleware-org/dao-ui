<script setup lang="ts">
import ProposalRow from '../components/ProposalRow.vue'
import { useProposals } from '../composables/useProposals.js'
import { useEpoch } from '../composables/useEpoch.js'

const { proposals } = useProposals()
const { epoch } = useEpoch()
</script>

<template>
  <div>
    <div class="dao-notice">
      Governance proposals are currently scaffolded with illustrative data.
      On-chain voting and contributions will be enabled when <code>vault_dao</code> is deployed.
    </div>

    <p class="dao-section-title">Active &amp; Pending Proposals</p>
    <ProposalRow
      v-for="p in proposals"
      :key="p.id"
      :proposal="p"
      :current-epoch="epoch"
    />
  </div>
</template>
