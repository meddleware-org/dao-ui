// Proposals will be sourced from the vault_dao on-chain module once it is deployed.
// Until then this composable returns an empty list — the ProposalsTab shows a
// "coming soon" notice when the list is empty.
// When vault_dao ships, replace this file with a composable that queries the on-chain
// proposal registry. The Proposal type and return shape are kept stable.

import { ref, readonly } from 'vue'

export type ProposalStatus = 'active' | 'pending' | 'closed'

export interface Proposal {
  id: string
  title: string
  description: string
  targetMist: bigint
  contributedMist: bigint
  endEpoch: number
  status: ProposalStatus
}

export function useProposals() {
  const proposals = ref<Proposal[]>([])
  const loading = ref(false)

  return { proposals: readonly(proposals), loading: readonly(loading) }
}
