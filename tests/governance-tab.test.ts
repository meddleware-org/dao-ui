import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { normalizeSuiAddress } from '@mysten/sui/utils'

// F14: the Governance tab restates a money rule and names the capability its check tests. Both texts must
// match the contract (access_gate.move: pays max(price x bps / 10000, min_commission_mist), capped at 10%
// of the price) and the check (ownsPlatformAdminCap looks for PlatformAdminCap only). The real client
// parses the config and runs the cap check; only the wallet's client, the account and the deployment are mocked.
const { getObject, listOwnedObjects, deployment } = vi.hoisted(() => ({
  getObject: vi.fn(),
  listOwnedObjects: vi.fn(),
  deployment: { current: null as null | { originalId: string; publishedAt: string; platformConfigId: string } },
}))
vi.mock('../src/wallet.js', async () => {
  const { shallowRef } = await import('vue')
  const account = shallowRef<null | { address: string }>(null)
  return {
    getSuiClient: () => ({ core: { getObject, listOwnedObjects } }),
    useWallet: () => ({ account }),
  }
})
vi.mock('../src/config.js', () => ({
  network: ref('testnet'),
  explorerNetwork: ref('testnet'),
  INDEXER_URL: '',
  requireDeployment: () => {
    if (!deployment.current) throw new Error('no access_gate deployment recorded')
    return deployment.current
  },
}))

import GovernanceTab from '../src/tabs/GovernanceTab.vue'
import { useWallet } from '../src/wallet.js'

const { account } = useWallet()

const PKG = normalizeSuiAddress('0xa1')
const CFG = normalizeSuiAddress('0xcf')
const TREASURY = normalizeSuiAddress('0x7e')
const WALLET = normalizeSuiAddress('0xb0')
const configObject = {
  object: {
    objectId: CFG,
    type: `${PKG}::access_gate::PlatformConfig`,
    json: { version: '1', treasury: TREASURY, commission_bps: '20', min_commission_mist: '1000000', free_gate_fee_mist: '100000000' },
  },
}

beforeEach(() => {
  getObject.mockReset()
  listOwnedObjects.mockReset()
  account.value = null
  deployment.current = { originalId: PKG, publishedAt: PKG, platformConfigId: CFG }
  getObject.mockResolvedValue(configObject)
})

const text = (w: { text(): string }) => w.text().replace(/\s+/g, ' ')

describe('GovernanceTab commission explanation', () => {
  it('states the contract rule: the percentage or the minimum, whichever is larger, capped at 10%', async () => {
    const w = mount(GovernanceTab)
    await flushPromises()
    const t = text(w)
    expect(t).toContain('max(price × commission_bps / 10000, minimum commission)')
    expect(t).toContain('never more than 10% of the price')
    expect(t).not.toContain('commission_bps / 10000 × price')
  })

  it('shows the live minimum commission from PlatformConfig', async () => {
    const w = mount(GovernanceTab)
    await flushPromises()
    expect(text(w)).toContain('Minimum commission1000000 MIST (0.001 SUI)')
    expect(text(w)).toContain('Commission rate0.20%')
  })
})

describe('GovernanceTab capability check', () => {
  it('names only PlatformAdminCap, the one capability the check tests, when the wallet lacks it', async () => {
    account.value = { address: WALLET }
    listOwnedObjects.mockResolvedValue({ objects: [], hasNextPage: false, cursor: null })
    const w = mount(GovernanceTab)
    await flushPromises()
    expect(text(w)).toContain('This wallet does not hold PlatformAdminCap.')
    expect(text(w)).not.toContain('DaoAdminCap')
    expect(listOwnedObjects).toHaveBeenCalledWith(
      expect.objectContaining({ owner: WALLET, type: `${PKG}::access_gate::PlatformAdminCap` }),
    )
  })

  it('reports a failed check as unverified, never as a missing cap', async () => {
    account.value = { address: WALLET }
    listOwnedObjects.mockRejectedValue(new Error('rpc down'))
    const w = mount(GovernanceTab)
    await flushPromises()
    expect(text(w)).toContain('Unable to verify capabilities')
    expect(text(w)).not.toContain('does not hold')
  })
})
