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
      On-chain governance proposals will appear here once <code>vault_dao</code> is deployed.
      Contributions and voting will be enabled at that point.
    </div>

    <template v-if="proposals.length > 0">
      <p class="dao-section-title">Active &amp; Pending Proposals</p>
      <ProposalRow
        v-for="p in proposals"
        :key="p.id"
        :proposal="p"
        :current-epoch="epoch"
      />
    </template>
    <div v-else class="dao-placeholder">
      No proposals yet.
    </div>
  </div>
</template>
