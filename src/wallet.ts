// Thin dao-ui shim over the shared @meddleware/wallet-adapter singleton.
// Wallet is used for signing only (DAO actions when vault_dao ships). All chain reads are done
// via a bare SuiClient so no wallet connection is required to view treasury/proposals/history.
import {
  // The shared wallet singleton's hook, under another name so this file's own `useWallet` can narrow it.
  useWallet as useWalletBase,
  // The shared client factory, for a given network and endpoint.
  getSuiClient as getSuiClientBase,
  // The shared network selector, for the network and its endpoint.
  useNetwork,
} from '@meddleware/wallet-adapter'

// The selected network and the endpoint for it.
const { network, rpcUrl } = useNetwork()

/** The read client for the selected network, built on each call so it follows a network switch. */
export function getSuiClient() {
  // A client for the selected network: reads need no connected wallet.
  return getSuiClientBase(network.value, rpcUrl.value)
}

/** The wallet connection (account, connect, disconnect) and the read client; shared with every other tool view on the page. */
export function useWallet() {
  // The shared connection, asking only for the one feature the Governance tab's capability check needs.
  const base = useWalletBase({ requiredFeatures: ['sui:signPersonalMessage'] })
  // Only what this console uses of it.
  return {
    account: base.account,
    connecting: base.connecting,
    connect: base.connect,
    disconnect: base.disconnect,
    getSuiClient,
  }
}
