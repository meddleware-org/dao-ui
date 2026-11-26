// Tests of the console's composables against the real access-gate client. Only the wallet's client and the deployment record are replaced; the client parses
// objects and decodes events itself, so a change in its wire formats shows here. Failures must read as plain words, never as the error's own text (src/availability.ts).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isReadonly, nextTick, ref } from 'vue'
import { bcs } from '@mysten/sui/bcs'
import { normalizeSuiAddress } from '@mysten/sui/utils'

// The composables are thin wrappers over @meddleware/access-gate-client. Only the wallet's client
// (the core API) and the deployment are mocked; the real client parses objects and decodes events.
// onMounted does not fire outside a component, so each test calls `reload()` directly.
const { listEvents, getObject, listOwnedObjects, getBalance, deployment } = vi.hoisted(() => ({
  listEvents: vi.fn(),
  getBalance: vi.fn(),
  getObject: vi.fn(),
  listOwnedObjects: vi.fn(),
  deployment: { current: null as null | { originalId: string; publishedAt: string; platformConfigId: string } },
}))
vi.mock('../src/wallet.js', () => ({ getSuiClient: () => ({ core: { listEvents, getObject, listOwnedObjects, getBalance } }) }))
vi.mock('../src/config.js', () => ({
  network: ref('testnet'),
  INDEXER_URL: '',
  requireDeployment: () => {
    if (!deployment.current) throw new NotDeployedError('mainnet')
    return deployment.current
  },
}))

import { NotDeployedError, UNREADABLE } from '../src/availability.js'
import { useDaoEvents } from '../src/composables/useDaoEvents.js'
import { useGates } from '../src/composables/useGates.js'
import { usePlatformConfig } from '../src/composables/usePlatformConfig.js'
import { useTreasury } from '../src/composables/useTreasury.js'
import { useProposals } from '../src/composables/useProposals.js'

const PKG = normalizeSuiAddress('0xa1')
const CFG = normalizeSuiAddress('0xcf')
const TREASURY = normalizeSuiAddress('0x7e')
// The buyer, holder and gate addresses the events and objects use.
const BUYER = normalizeSuiAddress('0xb0')
const HOLDER = normalizeSuiAddress('0xc0')
const GATE = normalizeSuiAddress('0x9a')

// The BCS layout of the mint event.
const Minted = bcs.struct('AccessMintedEvent', {
  nft_id: bcs.Address, gate_id: bcs.Address, soulbound: bcs.bool(), initial_uses: bcs.u64(),
  recipient: bcs.Address, commission_mist: bcs.u64(), timestamp_ms: bcs.u64(),
})
// The BCS layout of the consume event.
const Consumed = bcs.struct('AccessConsumedEvent', {
  nft_id: bcs.Address, gate_id: bcs.Address, nonce: bcs.vector(bcs.u8()), consumer: bcs.Address,
  uses_after: bcs.u64(), timestamp_ms: bcs.u64(),
})
// One event as the node returns it.
const ev = (name: string, bytes: Uint8Array, checkpoint: string, pkg = PKG) => ({
  eventType: `${pkg}::access_gate::${name}`, sender: HOLDER, bcs: bytes, checkpoint, transactionDigest: `tx${checkpoint}`, eventIndex: 0,
})
// A mint event for the given checkpoint, decoded by the client's own parser.
const minted = (checkpoint: string, pkg = PKG) =>
  ev('AccessMintedEvent', Minted.serialize({ nft_id: GATE, gate_id: GATE, soulbound: false, initial_uses: 1, recipient: BUYER, commission_mist: 1, timestamp_ms: 1 }).toBytes(), checkpoint, pkg)
// A consume event for the given checkpoint.
const consumed = (checkpoint: string) =>
  ev('AccessConsumedEvent', Consumed.serialize({ nft_id: GATE, gate_id: GATE, nonce: [...Buffer.from('nonce-123')], consumer: HOLDER, uses_after: 0, timestamp_ms: 2 }).toBytes(), checkpoint)

// A PlatformConfig object as the core API returns it.
const configObject = { object: { objectId: CFG, type: `${PKG}::access_gate::PlatformConfig`, json: { version: '1', treasury: TREASURY, commission_bps: '20', min_commission_mist: '1000000', free_gate_fee_mist: '100000000' } } }

// A clean set of mocks and the recorded deployment before each test.
beforeEach(() => {
  listEvents.mockReset()
  getObject.mockReset()
  listOwnedObjects.mockReset()
  getBalance.mockReset()
  deployment.current = { originalId: PKG, publishedAt: PKG, platformConfigId: CFG }
})

// The activity feed: how events are merged, paged and worded when the history is pruned or a deployment is missing.
describe('useDaoEvents', () => {
  it('shows the consumer of a consume and the recipient of a mint, newest first', async () => {
    listEvents.mockResolvedValueOnce({ events: [consumed('9'), minted('8')], hasNextPage: false, endCursor: null })
    const { events, error, reload } = useDaoEvents()
    await reload()
    expect(error.value).toBeNull()
    expect(events.value).toEqual([
      { type: 'AccessConsumed', txDigest: 'tx9', checkpoint: '9', address: HOLDER },
      { type: 'AccessMinted', txDigest: 'tx8', checkpoint: '8', address: BUYER },
    ])
  })

  it('drops events of a look-alike package', async () => {
    listEvents.mockResolvedValueOnce({ events: [minted('5', normalizeSuiAddress('0xa1a1'))], hasNextPage: false, endCursor: null })
    const { events, reload } = useDaoEvents()
    await reload()
    expect(events.value).toEqual([])
  })

  it('pages until the limit is reached', async () => {
    listEvents
      .mockResolvedValueOnce({ events: [minted('3')], hasNextPage: true, endCursor: 'c1' })
      .mockResolvedValueOnce({ events: [minted('2'), minted('1')], hasNextPage: true, endCursor: 'c2' })
    const { events, reload } = useDaoEvents(2)
    await reload()
    expect(events.value.map((e) => e.checkpoint)).toEqual(['3', '2'])
  })

  it('says in plain words that older activity cannot be shown when the node has pruned the history', async () => {
    listEvents.mockRejectedValueOnce(new Error('requested data below earliest available; lowest available checkpoint is 99'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { events, error, reload } = useDaoEvents()
    await reload()
    expect(error.value).toBe('Older activity cannot be shown right now. Try again later.')
    expect(events.value).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('surfaces a missing deployment as an error', async () => {
    deployment.current = null
    const { error, reload } = useDaoEvents()
    await reload()
    expect(error.value).toBe('The DAO console is not available on mainnet.')
    expect(listEvents).not.toHaveBeenCalled()
  })
})

// The platform settings read from the recorded PlatformConfig object.
describe('usePlatformConfig', () => {
  it('reads treasury and commission from the recorded PlatformConfig', async () => {
    getObject.mockResolvedValueOnce(configObject)
    const { config, reload } = usePlatformConfig()
    await reload()
    expect(getObject).toHaveBeenCalledWith({ objectId: CFG, include: { json: true } })
    expect(config.value).toEqual({ treasury: TREASURY, commissionBps: 20, minCommissionMist: 1_000_000n })
  })

  it('refuses an object that is not this package\'s PlatformConfig', async () => {
    getObject.mockResolvedValueOnce({ object: { ...configObject.object, type: `${normalizeSuiAddress('0xa1a1')}::access_gate::PlatformConfig` } })
    const { config, error, reload } = usePlatformConfig()
    await reload()
    expect(config.value).toBeNull()
    expect(error.value).toBe(UNREADABLE)
  })
})

/** A complete Gate `json` (access-gate-client's parser rejects one with a missing field). */
const gateJson = (over: Record<string, unknown>) => ({
  price_mist: '0',
  payment_recipient: TREASURY,
  default_uses: '0',
  soulbound: false,
  auto_burn_at_zero: false,
  paused: false,
  frozen: false,
  nft_name: '',
  nft_image_url: '',
  nft_description: '',
  policy: { freeze_requires_unpaused: false, lock_commission_on_freeze: false, pause_blocks_decryption: false, pause_blocks_access: false },
  locked_commission: null,
  free_fee_paid: false,
  ...over,
})

// The gates the treasury administers, found through its AdminCaps.
describe('useGates', () => {
  it('lists the treasury\'s gates across pages and leaves out one that cannot be read', async () => {
    const cap = (id: string, gate: string) => ({ objectId: id, type: `${PKG}::access_gate::AdminCap`, json: { gate_id: gate } })
    listOwnedObjects
      .mockResolvedValueOnce({ objects: [cap('0x1', '0xbad')], hasNextPage: true, cursor: 'p2' })
      .mockResolvedValueOnce({ objects: [cap('0x2', GATE)], hasNextPage: false, cursor: null })
    getObject.mockImplementation(async ({ objectId }: { objectId: string }) => {
      if (objectId === CFG) return configObject
      // access-gate-client hands back normalised ids.
      if (objectId === normalizeSuiAddress('0xbad')) throw new Error('gate fetch failed')
      return { object: { objectId, type: `${PKG}::access_gate::Gate`, json: gateJson({ nft_name: 'Good', price_mist: '100', paused: false, frozen: true }) } }
    })
    const { gates, error, reload } = useGates()
    await reload()
    expect(error.value).toBeNull()
    expect(gates.value).toEqual([{ id: GATE, name: 'Good', price: 100n, paused: false, frozen: true }])
    expect(listOwnedObjects).toHaveBeenCalledWith(expect.objectContaining({ owner: TREASURY, type: `${PKG}::access_gate::AdminCap` }))
  })
})

// The proposals stub: an empty, read-only list until the vault_dao module ships.
describe('useProposals — empty + readonly stub', () => {
  it('exposes an empty, readonly list until vault_dao ships', () => {
    const { proposals, loading } = useProposals()
    expect(proposals.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(isReadonly(proposals)).toBe(true)
    expect(isReadonly(loading)).toBe(true)
  })
})

// The treasury balance, which follows the address as it becomes known.
describe('useTreasury', () => {
  const flush = () => new Promise((r) => setTimeout(r, 0))
  const bal = (total: string, coins: string) => ({ balance: { coinType: '0x2::sui::SUI', balance: total, coinBalance: coins, addressBalance: String(BigInt(total) - BigInt(coins)) } })

  it('counts coin objects and the address balance', async () => {
    getBalance.mockResolvedValue(bal('15', '10'))
    const { balance, error } = useTreasury(() => TREASURY)
    await flush()
    expect(getBalance).toHaveBeenCalledWith({ owner: TREASURY, coinType: '0x2::sui::SUI' })
    expect(balance.value).toBe(15n)
    expect(error.value).toBeNull()
  })

  it('keeps the newest address when an older read resolves last', async () => {
    let resolveOld: (v: unknown) => void = () => {}
    getBalance.mockImplementationOnce(() => new Promise((r) => (resolveOld = r))).mockResolvedValueOnce(bal('2', '2'))
    const addr = ref<string | null>(BUYER)
    const { balance, loading } = useTreasury(() => addr.value)
    addr.value = TREASURY
    await nextTick()
    await flush()
    resolveOld(bal('1', '1'))
    await flush()
    expect(balance.value).toBe(2n)
    expect(loading.value).toBe(false)
  })

  it('clears while the address is unknown, and on a failed read', async () => {
    getBalance.mockResolvedValueOnce(bal('5', '5')).mockRejectedValueOnce(new Error('unavailable'))
    const addr = ref<string | null>(TREASURY)
    const { balance, error } = useTreasury(() => addr.value)
    await flush()
    expect(balance.value).toBe(5n)
    addr.value = null
    await nextTick()
    expect(balance.value).toBeNull()
    addr.value = BUYER
    await nextTick()
    await flush()
    expect(balance.value).toBeNull()
    expect(error.value).toBe(UNREADABLE)
  })
})
