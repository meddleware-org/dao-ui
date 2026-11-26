// What a person is told when the console cannot show something. A raw error message can quote an address the page asked (a node's or an
// indexer's), and a person can do nothing with it, so the page says what they can do (wait, or use another network) and the technical
// cause goes to the console for the developer (the workspace's configuration rule D146: a message never repeats a configured address).
// Related: config.ts throws `NotDeployedError`; the composables in composables/ call `plainFailure`.

/** No `access_gate` deployment is recorded for the network. Not a fault: the console is simply not offered there. */
export class NotDeployedError extends Error {
  /** The network the error is about, so the words can name it. */
  readonly network: string
  /** Build the error for `network`. The message is for the developer; a person reads `plainFailure`'s words. */
  constructor(network: string) {
    super(`no access_gate deployment recorded for ${network}`)
    this.name = 'NotDeployedError'
    this.network = network
  }
}

/** The words for any read that failed for a reason the person cannot act on. */
export const UNREADABLE = 'This cannot be read right now. Try again later.'

/** The causes already written to the console, so a refresh that fails the same way does not repeat itself. */
const reported = new Set<string>()

/**
 * The words a person reads for a failed read of `what` (for example "the platform settings"). A network with no recorded deployment gets
 * its own sentence; any other failure gets `UNREADABLE`, and its technical cause is written to the console once.
 *
 * @param what - what was being read, for the console line
 * @param e - the error the read threw
 * @returns the sentence to show
 */
export function plainFailure(what: string, e: unknown): string {
  // Not a fault: the console is not offered on this network.
  if (e instanceof NotDeployedError) return `The DAO console is not available on ${e.network}.`
  // One console line per distinct cause.
  const line = `dao-ui: reading ${what} failed (${e instanceof Error ? e.message : String(e)})`
  if (!reported.has(line)) {
    reported.add(line)
    console.error(line)
  }
  return UNREADABLE
}
