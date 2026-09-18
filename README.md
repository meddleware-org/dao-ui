# @meddleware/dao-ui

The **Meddleware DAO console** — a standalone Vue 3 SPA (and embeddable library) that surfaces the
platform's on-chain state on Sui: treasury balance, commission policy, the community access gates the
treasury controls, and a live feed of access-gate activity.

Deployed at `sui-dao.meddleware.co.uk` and also embedded inline in the tools hub
(`sui.meddleware.co.uk`) as the default view.

## What it shows

The console is **read-only today** — no wallet connection is required to view any data. It reads
directly from Sui via a bare RPC client. Five tabs:

| Tab | Content |
| --- | --- |
| **Overview** | Treasury balance + commission rate, platform activity counters (active gates, accesses minted/consumed), and a recent-activity feed. |
| **Treasury** | Commission rate (bps), current SUI balance, treasury address, and the table of **Community Gates** the treasury controls (name, price, object id). |
| **Proposals** | Fundraising / governance proposals. **Placeholder** until the `vault_dao` on-chain module ships — shows an empty state today (see [Roadmap](#roadmap)). |
| **Governance** | Platform parameters (commission rate, the on-chain 10% / 1000-bps hard cap, treasury address) and an **Admin Actions** panel that detects whether the connected wallet holds a `PlatformAdminCap`. Controls light up only for cap holders (implementation pending). |
| **History** | Paginated on-chain event log (access sold / used / burned) with explorer links per address and transaction. |

## How gate discovery works

Gates are discovered by **`AdminCap` ownership**, not by events:

1. Read the treasury address from the `PlatformConfig` shared object.
2. List `access_gate::AdminCap` objects owned by the treasury.
3. Fetch each `Gate` shared object referenced by its `AdminCap.gate_id`.

This is deliberately **resilient to event pruning** — testnet fullnodes prune old events (including
the one-time `GateCreatedEvent`) after ~3 months, so event-based gate counting is unreliable. The
`AdminCap`→`Gate` path always reflects live on-chain reality. See
[`src/composables/useGates.ts`](src/composables/useGates.ts).

## Commission model

Commission is charged on every NFT access purchase and enforced on-chain by the `access_gate`
package: `commission_bps / 10000 × price` routes to the treasury; the remainder goes to the gate
operator. `commission_bps` is read live from `PlatformConfig`; the on-chain hard cap is 1000 bps
(10%).

## Configure (build-time `VITE_*`)

All values have working testnet defaults; override per network for mainnet.

| Var | Meaning |
| --- | --- |
| `VITE_NETWORK` | `testnet` (default) or `mainnet` |
| `VITE_RPC_TESTNET` / `VITE_RPC_MAINNET` | Sui RPC URL override |
| `VITE_ACCESS_GATE_PACKAGE_ID_{NET}` | Published `access_gate` package id (governs which events/objects are queried) |
| `VITE_PLATFORM_CONFIG_ID_{NET}` | `PlatformConfig` shared-object id (commission + treasury) |

Mainnet package/config ids are empty until deployment; set them via the `_MAINNET` vars — no code
change required.

## Develop

```sh
npm install
npm run dev          # vite dev server
npm run type-check   # vue-tsc --noEmit
npm test             # vitest
```

## Build

```sh
npm run build        # vue-tsc + vite → dist/
docker build -t dao-ui .
```

## Use as a library

The package exports the core view so the dashboard (or any host) can render it inline against a
shared wallet:

```ts
import { DaoView } from '@meddleware/dao-ui'
```

`DaoView` imports its own scoped stylesheet (`styles/qt.css`), so no consumer needs to import dao-ui
CSS separately. See [CLAUDE.md](CLAUDE.md) for the dual app+library architecture.

## Roadmap

- **`vault_dao` on-chain module** — proposals and governance are stubbed
  ([`src/composables/useProposals.ts`](src/composables/useProposals.ts) returns an empty list; the
  Governance admin panel detects the cap but has no actions yet). When `vault_dao` ships, the
  `Proposal` type and composable return shapes are kept stable so the UI wiring is unchanged.

## License

BSD Zero Clause License (`0BSD`). See [LICENSE](LICENSE).
