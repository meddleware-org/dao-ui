// Proposals will be sourced from the vault_dao on-chain module once it is deployed.
// Until then this composable returns an empty list — the ProposalsTab shows an empty
// state ("No proposals yet.") when the list is empty.
// When vault_dao ships, replace this file with a composable that queries the on-chain
// proposal registry. The Proposal type and return shape are kept stable.
// Related: ProposalsTab.vue (the list) and components/ProposalRow.vue (one proposal).

// `ref` holds the list; `readonly` hands it out so a view cannot change it.
import { ref, readonly } from 'vue'

/** Where a proposal stands. */
export type ProposalStatus = 'active' | 'pending' | 'closed'

/** One fundraising or governance proposal. Amounts are MIST. */
export interface Proposal {
  id: string
  title: string
  description: string
  targetMist: bigint
  contributedMist: bigint
  /** The epoch the proposal ends in. */
  endEpoch: number
  status: ProposalStatus
}

/** The proposals (always empty until the vault_dao module ships) and their loading flag, both read-only. */
export function useProposals() {
  // The list; nothing writes to it yet.
  const proposals = ref<Proposal[]>([])
  // Nothing is loaded, so this stays false.
  const loading = ref(false)

  return { proposals: readonly(proposals), loading: readonly(loading) }
}
