// Chain configuration for the console. The network is wallet-adapter's shared runtime selector: the one source for the client, the
// access_gate ids, the explorer links and the status bar. The ids come from @meddleware/access-gate-client/deployments, generated from
// access-gate-sui's published records. Related: wallet.ts (the client for this network), composables/ (the reads that use these).
import { computed } from 'vue'
// The shared selector for the network.
import { useNetwork } from '@meddleware/wallet-adapter'
// The recorded deployments (ids per network).
import { accessGateDeployment, type AccessGateDeployment } from '@meddleware/access-gate-client/deployments'
// `withRuntimeEnv` reads a build variable and lets /runtime-config.json override it (ADR-0005); `SuiNetwork` types the explorer's networks.
import { withRuntimeEnv, type SuiNetwork } from '@meddleware/ui'
// The error for a network with no recorded deployment.
import { NotDeployedError } from './availability.js'

/** The active network (read-only ref; the standalone build selects `VITE_NETWORK` in main.ts). */
export const network = useNetwork().network

/** SuiVision has no localnet; nothing is listed there (no deployment), so testnet links are inert. */
export const explorerNetwork = computed<SuiNetwork>(() => (network.value === 'mainnet' ? 'mainnet' : 'testnet'))

/**
 * The access_gate deployment on the active network.
 *
 * @throws {NotDeployedError} if none is recorded for it (e.g. mainnet before launch, or localnet); `plainFailure` words it for a person.
 */
export function requireDeployment(): AccessGateDeployment {
  try {
    // The ids for the active network; the client throws for a network it has no record of.
    return accessGateDeployment(network.value)
  } catch {
    // Turn the client's error into one that names only the network.
    throw new NotDeployedError(network.value)
  }
}

/**
 * Optional read-indexer (display data only; reads fall back to the full node). It is a machine-zone endpoint, so a runtime override
 * (/runtime-config.json, ADR-0005) wins over the build variable.
 */
export const INDEXER_URL: string = withRuntimeEnv(import.meta.env).VITE_INDEXER_URL || ''
