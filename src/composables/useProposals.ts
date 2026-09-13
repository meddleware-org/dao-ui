// Proposals are backed by mock data until vault_dao is deployed on-chain.
// When vault_dao ships, replace this composable with one that queries the on-chain
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

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'prop-001',
    title: 'mwSUI Vault Strategy — Haedal LST Allocation',
    description:
      'Allocate 10% of vault AUM to haSUI (Haedal liquid-staked SUI) to diversify yield sources beyond Spring Finance sSUI. Requires at least 50 SUI in community endorsement to enact.',
    targetMist: 50_000_000_000n,
    contributedMist: 0n,
    endEpoch: 620,
    status: 'active',
  },
  {
    id: 'prop-002',
    title: 'Commission Rate Reduction — 0.20% → 0.15%',
    description:
      'Reduce the access-gate platform commission from 20 bps to 15 bps to stay competitive with comparable NFT-gated relay services.',
    targetMist: 25_000_000_000n,
    contributedMist: 0n,
    endEpoch: 640,
    status: 'active',
  },
  {
    id: 'prop-003',
    title: 'Sealed Storage Relay Integration',
    description:
      'Route Seal uploads through the Meddleware Walrus relay so relay tips are captured and included in the fee distribution cycle.',
    targetMist: 100_000_000_000n,
    contributedMist: 0n,
    endEpoch: 680,
    status: 'pending',
  },
]

export function useProposals() {
  const proposals = ref<Proposal[]>(MOCK_PROPOSALS)
  const loading = ref(false)

  return { proposals: readonly(proposals), loading: readonly(loading) }
}
