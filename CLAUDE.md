# CLAUDE.md — @meddleware/dao-ui

## What this app is

The **Meddleware DAO console**: a Vue 3 SPA that surfaces the platform's on-chain state on Sui —
treasury balance, commission policy, the community access gates the treasury controls, and a live
feed of access-gate activity. It is both a standalone SPA (`sui-dao.meddleware.co.uk`) and a library
whose `DaoView` is embedded inline in the dashboard (`sui.meddleware.co.uk`) as the default view.

## Architectural invariants

- **Read-only, wallet-optional.** All displayed data is read from Sui via a bare `SuiClient`; no
  wallet connection is required to view treasury, gates, proposals, or history. A wallet is used
  **only** for capability detection today (Governance tab checks for `PlatformAdminCap`) and for
  signing once privileged DAO actions ship.
- **On-chain truth, thin app.** No accounting or policy logic lives here. Commission math, the
  commission cap, and gate lifecycle are enforced by the `access_gate` Move package; this app only
  reads and renders. Do not move financial truth into the frontend.
- **Gate discovery is `AdminCap`-based, not event-based.** `useGates.ts` reads the treasury from
  `PlatformConfig`, lists `access_gate::AdminCap` objects it owns, and resolves each `Gate` by
  `AdminCap.gate_id`. This is intentional: testnet prunes the one-time `GateCreatedEvent` after
  ~3 months, so event-based discovery under-counts. Do **not** revert to counting `GateCreatedEvent`.
- **Events tolerate pruning + partial failure.** `useDaoEvents.ts` queries each event type with
  `Promise.allSettled`, merges, and globally sorts by checkpoint descending. A pruned or failing
  event type degrades gracefully rather than erroring the whole feed. Only the still-indexed
  `AccessMinted` / `AccessConsumed` (+ `AccessBurned`) types are queried; `GateCreated` was removed.
- **Wallet-agnostic + shared.** Wallet access goes through `src/wallet.ts`, a thin shim over the
  shared `@meddleware/wallet-adapter` singleton (bound to this app's network/RPC). The singleton
  means that when `DaoView` embeds in the dashboard next to other tool views, they share one
  connection. Do not reintroduce a local wallet-standard implementation.
- **Desktop-application aesthetic is deliberate.** `styles/qt.css` gives the console a raised-tab,
  status-bar, panel-based "native app" look. `TabBar.vue` is intentionally distinct from the shared
  `@meddleware/ui` tab styling and stays bespoke.

## Key files

| File | Purpose |
| --- | --- |
| `src/config.ts` | Build-time env: network, RPC, `access_gate` package id, `PlatformConfig` id. Derives `PACKAGE_ID` / `CONFIG_ID` / `RPC_URL` for the active network. |
| `src/wallet.ts` | Shim over `@meddleware/wallet-adapter`; exposes `getSuiClient()` (bare reads) + `useWallet()` (sign-only, `sui:signPersonalMessage`). |
| `src/DaoView.vue` | Core tool UI — tab shell + status bar. Imports `styles/qt.css` itself so it works when consumed as a library. Exported from `src/index.ts`. |
| `src/index.ts` | Library entry — exports `DaoView`. |
| `src/App.vue` | Standalone shell only: `AppHeader` (+ network badge, `ColorModeControl`) + `<DaoView>` + `AppFooter`. |
| `src/main.ts` | Standalone bootstrap — imports design-tokens + ui base CSS + `qt.css`, mounts `App`. |
| `src/composables/usePlatformConfig.ts` | Reads `PlatformConfig` → `{ treasury, commissionBps }`. |
| `src/composables/useTreasury.ts` | Reads the treasury's SUI balance, reactive to the address getter. |
| `src/composables/useGates.ts` | `AdminCap`-ownership gate discovery (pruning-resistant). |
| `src/composables/useDaoEvents.ts` | Merged, checkpoint-sorted access-gate event feed. |
| `src/composables/useProposals.ts` | **Stub** — empty list until `vault_dao` ships; `Proposal` shape kept stable. |
| `src/composables/useEpoch.ts` | Current Sui epoch for the status bar (non-fatal on failure). |
| `src/tabs/*` | Overview / Treasury / Proposals / Governance / History tab views. |
| `src/components/*` | Presentational: `TabBar`, `StatusBar`, `Panel`, `DataTable`, `AmountCell`, `ProposalRow`. |
| `src/styles/qt.css` | The console's scoped visual language (panels, tabs, status bar, badges). |

## Dual app + library

Like `seal-ui`, this package is **both** a standalone SPA (`App.vue` + `main.ts`, `vite build`) and a
library (`src/index.ts` exports `DaoView`, resolved via `"exports"`). The dashboard imports `DaoView`
and wraps it in its own shell + shared wallet. `DaoView` imports its own `qt.css`, so no consumer
needs dao-ui's global CSS. Keep `App.vue` a thin shell; keep tool UI in `DaoView.vue` and its tabs.

## What NOT to do

- Do not count `GateCreatedEvent` for gate discovery — it is pruned on testnet. Use `AdminCap`
  ownership (`useGates.ts`).
- Do not add accounting/commission logic here; it is on-chain in `access_gate`.
- Do not require a wallet for reads. Reads use a bare `SuiClient`.
- Do not hardcode network ids; read `import.meta.env.VITE_*` via `src/config.ts`.
- Do not restyle via a global stylesheet in the library path; `DaoView` carries scoped `qt.css`.

## Roadmap — `vault_dao`

Proposals and Governance admin actions are stubbed pending the on-chain `vault_dao` module. The
`Proposal` type and the `useProposals` / cap-detection return shapes are intentionally stable so that
wiring the real module in is a composable-body swap, not a UI rewrite.

---

## Deferred documentation — NOT for the `docs.` website (planned here per Part 0.4)

> The following is captured for the future **`dev.meddleware.co.uk`** developer subdomain and the
> **white-label** offering. It is deliberately **excluded from the user-facing `docs.` site**, but
> planned here so the later build is transcription, not rediscovery.

### `dev.` — developer integration (to write later)

- **Embed `DaoView` in a host app:** `import { DaoView } from '@meddleware/dao-ui'`; provide the
  shared `@meddleware/wallet-adapter` context; note that `DaoView` self-imports `qt.css`. Document the
  peer expectation on `@meddleware/ui` + `@meddleware/design-tokens` for full theming.
- **Point at your own deployment:** enumerate every `VITE_*` (network, RPC, `access_gate` package id,
  `PlatformConfig` id) and how to source `PlatformConfig`/`AdminCap`/`Gate` ids after deploying the
  `access_gate` package.
- **Composable API reference:** `usePlatformConfig`, `useTreasury`, `useGates`, `useDaoEvents`,
  `useEpoch`, `useProposals` — return shapes + the on-chain objects/events each reads. This is a good
  TypeDoc target once the composables are exported from `src/index.ts`.
- **Event/object schemas:** `PlatformConfig`, `AdminCap`, `Gate`, and `AccessMinted/Consumed/Burned`
  JSON shapes (source of truth: the `access_gate` Move package).

### White-label operator path (to write later)

- Fork/deploy the console against a **different `PlatformConfig` + treasury** so an operator sees
  *their* treasury, commission, and gates. Document which `VITE_*` to change and the branding seams
  (`@meddleware/design-tokens` overrides, `AppHeader` brand slot, network badge).
- Clarify what is fixed by the shared `access_gate` package (commission cap, gate lifecycle) vs.
  what a white-label operator controls (their treasury, commission within the cap, gate set).
