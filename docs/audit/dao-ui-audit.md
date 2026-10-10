# Security Audit — `dao-ui`

**Classification:** Internal security review
**Project:** `repos/dao-ui` — `@meddleware/dao-ui`, Vue 3 DAO console (overview, treasury, governance, history, proposals; standalone SPA + `DaoView` library)
**Project type:** Vue app + UI library
**Template:** AUDIT_TEMPLATE.md (2026-10-08) + AUDIT_TEMPLATE_SUI_CLIENT.md (2026-10-08) + AUDIT_TEMPLATE_TS.md (2026-10-08) + AUDIT_TEMPLATE_VUE.md (2026-10-08) + AUDIT_TEMPLATE_IMG.md (2026-10-08)
**Sui SDK:** `@mysten/sui ^2.33.2` (installed 2.35.0, one copy; `npm ls` single version)   **Transport:** gRPC through wallet-adapter; optional read-indexer over HTTPS
**Networks:** testnet (recorded deployment); any other network reports "no deployment" instead of querying
**On-chain packages consumed:** `access_gate` (reads only) through `@meddleware/access-gate-client/deployments` (0.0.8: testnet `0xd7ddaa94…88c9`, PlatformConfig `0x3f81489d…e7b5`; reads use `originalId`)
**Package manager / lockfile:** npm 11, committed (also copied into the image for SBOM tools)   **Module format / publish model:** ESM; ships source (library) + SPA image
**Runtime targets:** browser   **Peer dependencies:** `@meddleware/wallet-adapter >=0.0.12 <0.2.0`
**Build tool:** vite 8.3, `@vitejs/plugin-vue` 6.0.9, vue 3.5.43, vue-tsc 3.3.x, TypeScript 6.0.3, vitest 5.0.3
**Hosting:** none while retired; the image is built to serve on static-server (CSP and HSTS from the server); no static-host `_headers` file
**Embedding hosts:** the dashboard — the `DaoView` route is commented out (`dashboard/src/router/index.ts`) though `@meddleware/dao-ui ^0.1.32` stays a dependency
**VITE_\* inventory:** `VITE_NETWORK` (testnet|mainnet, baked, selects the network only), `VITE_INDEXER_URL` (optional read-indexer base URL, baked, display data), `VITE_DOCS_URL` / `VITE_DEV_URL` (footer links, baked); all public, none selects an on-chain id; all four are in `.env.example`
**Images:** `quay.io/meddleware-org/dao-ui:0.1.33@sha256:07656932…c685` (published on the 0.1.33 tag, read from the quay.io API 2026-10-09; not deployed, so outside `verify-digests.sh`); last deployed `0.1.20@sha256:574a519a…3605` (still pinned in the parked overlay)
**Base images:** build `node:24-slim@sha256:0e0ff40c…f9b6`; runtime `quay.io/meddleware-org/static-server:0.1.7@sha256:2e227311…2379` (Go 1.26.9)
**Runtime user:** `USER 65534:65534`   **Runtime FS:** read-only root in the parked manifest, no writable mounts
**Deployed by:** nothing — parked at `post-bootstrap/_retired/dao-ui/overlays/default`; not in `config/images.yaml`; `sui-dao.meddleware.co.uk` is gone (no response 2026-10-09)
**Build args:** `VITE_NETWORK`, `VITE_INDEXER_URL` and `CSP` — none secret, none a test switch
**Deployment status:** npm v0.1.33 (2026-10-09). **Retired from hosting** since 2026-09-28 — `post-bootstrap/_retired/dao-ui`, torn down, not in `config/images.yaml`, dashboard route commented out (until governance is usable); the image still builds and is signed on tags.
**Review date:** 2026-09-18 (first pass) · re-verified 2026-10-03 · re-verified 2026-10-09
**Reviewer:** Internal review
**Severity ceiling:** Low — read-only: nothing is signed; a wallet is used only to detect a `PlatformAdminCap`.
**Status:** re-verified 2026-10-09

---

## Executive summary

A read-only console over `access_gate` state: the platform's `PlatformConfig`, the treasury's SUI,
the gates the treasury administers, and recent mints and consumes. Every object and event read goes
through access-gate-client (exact types at the deployment's original id, fail-closed parsers); the
app adds formatting only. Proposals are an empty, read-only stub until a governance module exists.

All first-pass findings are positive, resolved or adjudicated. This pass found:

- **F7 (Low, RESOLVED 0.1.27)** — the treasury balance counted only coin objects, so SUI held in the
  treasury's address balance (SIP-58) was left out. It now shows the total.
- **F8 (Low, RESOLVED 0.1.27)** — the treasury and epoch reads had no stale-result guard; after a
  network switch an older, slower read could overwrite the new one.

Re-verified 2026-10-09 (0.1.33; 13 unit tests, type-check and all three linters green, audit gate
1 allowlisted / 0 open). The app is retired from the cluster, so nothing here is served; the code is
kept current because the package and image still publish. F1 to F8 hold. Since the last pass:

- **F9 (Low, RESOLVED 0.1.30)** — the treasury address is shown in full.
- **F10 (Low, RESOLVED 0.1.32–0.1.33)** — the image release runs the full CI workflow, scans the
  published image before cosign signs it, ships the lockfile for SBOM tools, serves
  `/THIRD_PARTY_LICENSES`, and runs as an explicit `USER 65534:65534` on static-server 0.1.7.
- The newly applicable lens checks found five defects that are **not yet fixed** (code changes are
  outside this alignment): **F11 (Low, DEFERRED)** `node-ci.yml` never runs the unit tests, so the
  release gate does not either; **F12 (Info, DEFERRED)** `qt.css:172` draws `--warning` as text
  (2.0:1 on the light canvas, design-tokens audit F10) in a rule no component uses; **F13 (Info,
  DEFERRED)** the package declares 0BSD but ships no `LICENSE` file; **F14 (Low, DEFERRED)** the
  Governance tab's explanation of the commission rule and its capability message do not match the
  contract and the check; **F19 (Info, DEFERRED)** the parked manifest lacks
  `automountServiceAccountToken: false`.
- Accepted or maintainer items: **F15** blanket `connect-src https:`, **F16** the npm job's gate is a
  subset of CI, **F17** the cosign identity pins the repository not the workflow (all ACCEPTED-RISK),
  **F18** registry mirror and credential inventory (DEFERRED, maintainer).

The severity ceiling stays Low.

## Threat model / trust boundaries

| Actor | Holds / proves | Can do | Bounded by |
| --- | --- | --- | --- |
| Viewer | nothing (wallet optional) | read | no signing path (I1) |
| Anyone on-chain | gate names, event fields | publish crafted strings | text interpolation; URLs through `suiExplorerUrl` + `ExplorerLink`'s `safeHref` |
| Full node / indexer | objects, events | lie, omit, go down | display only; exact types; indexer display-only with full-node fallback |
| Same-origin script | the shared wallet | nothing here (no signing) | — |
| Static host / CDN | headers and served bytes | modify or strip them | not hosted while retired; when re-enabled: digest-pinned image, CSP and HSTS from static-server (B.VUE-1) |
| Whoever controls the build environment | `VITE_NETWORK`, `VITE_INDEXER_URL` | point the console at another network or indexer | public values; no id or test switch (I3); the indexer is display data |
| Embedding host (dashboard) | the page around `DaoView`, the shared wallet | switch account or network under the view | cap check guarded across account and network changes (I5); route currently disabled |
| Base-image publisher, registry, CI publish job | image layers, what is signed | ship altered bytes | digest pinning, Trivy before cosign, keyless signature, SBOM and provenance (B.2, F10) |

### On-chain dependency matrix

| Object / package | ID (original-id · published-at) | Sourced from | Used as | If stale, wrong or attacker-supplied | Fails open / closed |
| --- | --- | --- | --- | --- | --- |
| `access_gate` package, testnet | `0xd7ddaa94…88c9` · same (fresh publication 2026-10-09) | `deployments` export of access-gate-client 0.0.8 | type and event filter (`originalId`) only; no call target | a look-alike package's events or objects displayed; a look-alike `PlatformAdminCap` reported | closed: exact types; `accessGateDeployment` throws and each composable reports it |
| `PlatformConfig`, testnet | `0x3f81489d…e7b5` | same | read for the treasury address and commission | wrong treasury address shown | closed on a read failure (error shown); display only |
| `PlatformAdminCap`, `AdminCap`, `Gate`, `AccessMinted`, `AccessConsumed` | defined at `originalId` | derived inside access-gate-client | owned-object and event reads; cap detection (`ownsPlatformAdminCap`) | look-alike objects listed or a cap claimed | closed (exact types, strict decoding); a failed cap check shows "Unable to verify" |
| mainnet, localnet | none recorded | — | — | — | closed (error, no query) |

## Severity scale

Critical / High / Medium / Low / Info / Positive.

## Scope

- **In scope (0.1.33):** `src/**` (`config.ts`, `wallet.ts`, `DaoView.vue`, `App.vue`, composables,
  tabs, components, `styles/qt.css`), `index.html`, `Dockerfile`, workflows, `.github/audit-gate.mjs`,
  `.github/dependabot.yml`, `scripts/third-party-licenses.mjs`, `SECURITY.md`; the parked manifests in
  `post-bootstrap/_retired/dao-ui/` (read-only).
- **Out of scope:** access-gate-client, wallet-adapter, ui (own audits).
- **Environment (2026-10-09):** `npm test` 13/13 (2 files, vitest 5.0.3); `vue-tsc`; stylelint, eslint,
  html-validate; production build; audit gate (1 allowlisted advisory, 0 open); `npm pack --dry-run`;
  the quay.io tag list. The repository has no `CHANGELOG.md` (the `files` list names one); `git log`
  carries the release history.

## Findings

### F1 — No XSS sinks

**Severity:** Positive — no `v-html`, `innerHTML` or `eval`; chain strings render as text; every
link is `suiExplorerUrl(kind, value, explorerNetwork)` passed to `ExplorerLink`, which binds it
through `safeHref` (ui F1). Re-checked 2026-10-09 (`grep` over `src/`): no `v-html`, `innerHTML`, `eval` or
`fetch`.

### F2 — Read-only

**Severity:** Positive — no transaction is built or signed. The wallet declares
`sui:signPersonalMessage` only for discovery; `GovernanceTab` uses the account solely to check for a
`PlatformAdminCap` (`ownsPlatformAdminCap`), with a generation guard across account and network
changes.

### F3 — Public configuration only

**Severity:** Positive — `VITE_NETWORK`, `VITE_INDEXER_URL` and docs links; the access_gate ids come
from the recorded deployment, not the build. Re-verified 2026-10-09: all four variables are in
`.env.example` and the Dockerfile; no id is configurable; the recorded testnet deployment is the
republished `access_gate` `0xd7ddaa94…88c9` / PlatformConfig `0x3f81489d…e7b5` (access-gate-client 0.0.8).

### F4 — Link safety depends on `@meddleware/ui`

**Severity:** Info   **Disposition:** ADJUDICATED — `suiExplorerUrl` fixes the `https://` scheme and
(from ui 0.1.29, ui F3) encodes the id; `ExplorerLink` applies `safeHref` (ui audit F1).

### F5 — Degradation is fail-safe

**Severity:** Positive — each composable reports its own error; unreadable gates are left out; the
indexer is optional and falls back to the full node; with no deployment for the network, every
access_gate composable reports it instead of querying.

### F6 — `SECURITY.md`, `npm ci`, dependency audit

**Severity:** Low   **Disposition:** RESOLVED — present; `npm ci` everywhere; the audit gate (TS lens
B.TS-3, expiring allowlist) runs in CI (`node-ci.yml`, which the image release now calls, F10) and the
npm publish workflow. Re-run 2026-10-09: `audit-gate.mjs` reports 1 high/critical advisory
(GHSA-vfj7-8cjw-p6xm, allowlisted to 2027-01-01, dev tooling only), 0 not allowlisted.

### F7 — Treasury balance left out the address balance

**Severity:** Low   **Disposition:** RESOLVED (0.1.27)
**Where:** `src/composables/useTreasury.ts`
**Issue / impact:** the balance came from `coinBalance`, which counts coin objects only. Funds sent to
the treasury with `send_funds` sit in its address balance, so the console under-reported what the
treasury holds. (Commission itself arrives as coins through `public_transfer`.)
**Remediation / evidence:** reads `balance.balance` — coin objects plus address balance, per the gRPC
`Balance` definition. Test "counts coin objects and the address balance". Commit `9327fef`; re-read
2026-10-09: unchanged.

### F8 — Stale treasury and epoch reads

**Severity:** Low   **Disposition:** RESOLVED (0.1.27)
**Where:** `src/composables/useTreasury.ts`, `src/composables/useEpoch.ts`
**Issue / impact:** unlike the other composables, these had no generation guard; a read for the old
network's treasury that resolved last overwrote the new one, and a failed read left the previous
address's balance on screen.
**Remediation / evidence:** both use `latest()`; the treasury clears on an unknown address and on a
failed read. Tests "keeps the newest address when an older read resolves last" and "clears while the
address is unknown, and on a failed read". Commit `9327fef`; re-read 2026-10-09: unchanged.

### F9 — Treasury addresses were truncated

**Severity:** Low   **Disposition:** RESOLVED (0.1.30, `d96fd3d`)
**Where:** `src/tabs/TreasuryTab.vue`, `src/tabs/GovernanceTab.vue`, `src/tabs/OverviewTab.vue`
**Issue:** the treasury address (where the platform commission lands) was shown truncated.
**Impact:** a truncated address is the form address-poisoning look-alikes imitate; the console is the
place to check the commission recipient.
**Remediation / evidence:** the tabs render the treasury address in full (`:truncate="false"` on
`CopyableAddress` and `ExplorerLink`) with a copy control and an explorer link through `safeHref`. Event
actors and gate object ids stay truncated with the full value on the link; they are log entries, not
recipients.

### F10 — Image release gate, scan, notices and runtime user

**Severity:** Low   **Disposition:** RESOLVED (0.1.32 `bfa2420`, 0.1.33 `d67c5e5`)
**Where:** `.github/workflows/docker-publish.yml`, `Dockerfile`, `scripts/third-party-licenses.mjs`
**Issue:** the image release was gated by a subset of CI (audit, type-check, unit tests), the published
image was not scanned before signing, the lockfile was not in the image (the SBOM saw only the base), no
third-party licence texts were served with the bundled npm code, and the runtime user was only
inherited from the base.
**Impact:** a tag could ship what CI would have refused; an SBOM that misses the bundled dependencies;
redistributed MIT/Apache code without its notices. The image is not deployed while retired, so the
exposure is a published, signed image others could pull.
**Remediation / evidence:** `verify` calls `node-ci.yml` (`workflow_call`) and every build job `needs`
it (it lacks the unit tests, F11); the merge-and-sign job builds per architecture, merges the manifest,
runs Trivy on the merged digest (CRITICAL/HIGH, fixable only, `exit-code: 1`) before `cosign sign`, then
an SPDX SBOM attestation and build provenance for quay.io and Docker Hub, with no `continue-on-error`
on the public path (the workflow is identical to treasury-ui's apart from the image name); the
Dockerfile runs `npm run licenses` in the build stage and copies `package-lock.json` to
`/usr/share/doc/dao-ui/`; CI runs `check:licenses`; the runtime base is static-server 0.1.7 (Go 1.26.9)
with an explicit `USER 65534:65534`; the 0.1.33 tag exists on quay.io (read 2026-10-09). Not run: a
Trivy *config* scan of the Dockerfile and manifests; the signature of the 0.1.33 image was not
re-verified because `verify-digests.sh` covers deployed images only.

### F11 — Unit tests are not run by CI or by the release gate

**Severity:** Low   **Disposition:** DEFERRED (next patch release; add one step to `node-ci.yml`)
**Where:** `.github/workflows/node-ci.yml` (no `npm test` step); `docker-publish.yml` `verify` calls it
**Issue:** CI runs the audit gate, type-check, the three linters, the build and the licence check, but not
the 13 unit tests. Only the npm job's `verify` runs `npm test`. The image release's own `verify` job did
run `npm test` until 0.1.33 (`d67c5e5`), which replaced it with a call to `node-ci.yml` (F10) and so
dropped the tests from the image gate; the comment in `docker-publish.yml` ("type-check, lint, tests,
build, licences") is wrong. TS lens: every test project that exists runs in CI.
**Impact:** a regression in the composables could merge and be released as an image without any gate
failing; the npm job would still catch it for the library. Low weight while the app is retired.
**Remediation / evidence:** add `- run: npm test` to `node-ci.yml` (as walrus-ui, token-deployer-ui and
ui do); verified by reading both workflows 2026-10-09 and running the suite locally (13/13 pass, so
adding the step turns nothing red).

### F12 — `--warning` drawn as text in an unused rule

**Severity:** Info   **Disposition:** DEFERRED (next patch release; delete the rule or use `--warning-text`)
**Where:** `src/styles/qt.css:167-175` (`.dao-notice { border/color: var(--warning); background: color-mix(… var(--warning) 10% …) }`)
**Issue:** `--warning` is the bright yellow fill (2.0:1 on the light canvas). The rule draws it as text
(design-tokens audit F2, F10; treasury-ui has the same rule). `grep` finds no use of `.dao-notice` in
this repo's `src/`, so the defect is latent. The stylesheet is exported with `DaoView`.
**Impact:** none today; a future warning notice would be hard to read in the light theme (VUE lens
*Colour & links*, WCAG AA 4.5:1). design-tokens 0.1.9 (installed) provides `--warning-text`.
**Remediation / evidence:** remove the unused rule, or switch the text colour to `var(--warning-text)`.
Browser contrast of this app's own screens is not checked per theme and season.

### F13 — No `LICENSE` file although the package declares 0BSD

**Severity:** Info   **Disposition:** DEFERRED (next patch release; add the file)
**Where:** repository root; `package.json` (`"license": "0BSD"`); `npm pack --dry-run` 2026-10-09
**Issue:** the repository has no `LICENSE` file, so the published tarball carries only the SPDX id.
access-gate-ui, seal-ui, walrus-ui and token-deployer-ui ship one. (treasury-ui lacks it too.)
**Impact:** documentation and tooling only: licence scanners and consumers read the file; 0BSD asks for
no attribution, and the image serves the bundled dependencies' notices (F10).
**Remediation / evidence:** add the 0BSD text (as in the sibling repositories); `files` then picks it up
automatically.

### F14 — The Governance tab misstates the commission rule and the capability check

**Severity:** Low   **Disposition:** DEFERRED (next patch release, or at the latest before the app is re-enabled — `post-bootstrap/_retired/README.md`)
**Where:** `src/tabs/GovernanceTab.vue` (footnote in *Platform Parameters*; the "not-found" message in *Admin Actions*)
**Issue:** (1) the footnote says commission is `commission_bps / 10000 × price`. The republished
contract pays `max(price × commission_bps / 10000, min_commission_mist)`, never more than 10% of the
price (`access_gate.move` header and `commission_for_price`; access-gate-client `commissionForPrice`).
The app hard-codes the explanation instead of reading the terms (it already reads `PlatformConfig`).
(2) the "not-found" message says the wallet holds neither `PlatformAdminCap` nor `DaoAdminCap`, but
`ownsPlatformAdminCap` checks only `PlatformAdminCap`.
**Impact:** an operator reading the tab could expect a lower commission on cheap gates than the contract
charges; the capability message could be wrong for a `DaoAdminCap` holder. Display only: nothing is
signed and the contract enforces the real rule. The tab is not reachable while the app is retired.
**Remediation / evidence:** state the rule as the contract does (or show the live minimum commission from
`PlatformConfig`) and drop `DaoAdminCap` from the message, or add that check to access-gate-client.
Frontend explanations of money rules must match the chain (on-chain-truth boundary).

### F15 — `connect-src` allows any https origin

**Severity:** Info   **Disposition:** ACCEPTED-RISK
**Where:** `Dockerfile` (`CSP` argument)
**Issue:** `connect-src 'self' https:` and `img-src 'self' data: blob: https:` are blanket allowances.
**Impact:** an injected script could send data to any https host. Script injection is the prerequisite,
and `script-src 'self' 'nonce-…'` (static-server) with no inline script and no XSS sink (I4) is the
control on that; the console holds no key, no session and no private data. Not served while retired.
**Remediation / evidence:** accepted: the full-node gRPC endpoint (wallet-adapter's per-network URL) and
the optional indexer are operator-configured per network. Revisit when the app is re-enabled and the
hosts are fixed. The policy is the same string treasury-ui serves, whose live header was read 2026-10-09.

### F16 — The npm publish gate is a subset of CI

**Severity:** Low   **Disposition:** ACCEPTED-RISK
**Where:** `.github/workflows/npm-publish.yml`
**Issue:** the npm job's `verify` runs `npm ci`, the audit gate, type-check and the unit tests, not the
full CI workflow (linters, licence check). The image release (F10) does run the full workflow on the
same tag.
**Impact:** a tag could publish the source package while the image job refuses the same commit. The
package is source only (`npm pack --dry-run` 2026-10-09: 22 `src` files, `index.html`, `vite.config.ts`,
`tsconfig.json`, README; no tests, fixtures or `.env*`).
**Remediation / evidence:** accepted: a source mirror kept aligned for the dashboard's dependency,
OIDC-published with provenance, tag == version checked, idempotent, and gated on the `NPM_PUBLISH`
variable. Calling `node-ci.yml` from `npm-publish.yml` would close it; not required for safety.

### F17 — The cosign identity pins the repository, not the workflow

**Severity:** Info   **Disposition:** ACCEPTED-RISK
**Where:** `bootstrap/images/verify-digests.sh` (workspace); this repository publishes no verify command
**Issue:** the cluster check accepts any workflow identity of `github.com/meddleware-org/dao-ui`.
**Impact:** a workflow added by someone with write access could sign an image the check would accept;
moot while the image is not deployed and therefore not checked.
**Remediation / evidence:** the repository is the signing boundary; anchoring to
`docker-publish.yml@refs/tags/v*` is a `COSIGN_IDENTITY_REGEXP` override in the workspace script.

### F18 — Self-hosted registry mirror and registry credentials

**Severity:** Info   **Disposition:** DEFERRED (maintainer; `OPERATOR_TASKS.md` "Image registry credentials — record scope and rotation")
**Where:** `docker-publish.yml` `*-docker-*-private` jobs (`continue-on-error: true`); `QUAY_TOKEN`, `DOCKERHUB_TOKEN`
**Issue:** the mirror jobs fail without registry credentials and never sign; the quay.io and Docker Hub
tokens are long-lived and not yet inventoried.
**Impact:** the mirror may lag; a leaked token could push an unsigned tag (nothing pulls this image).
**Remediation / evidence:** the mirror is listed as best-effort; the public jobs have no
`continue-on-error`. The credential inventory (scope, holder, expiry, rotation) is the maintainer item.

### F19 — The parked manifest does not set `automountServiceAccountToken: false`

**Severity:** Info   **Disposition:** DEFERRED (gate: re-enabling dao-ui — `post-bootstrap/_retired/README.md` step 1; governance must be usable first)
**Where:** `post-bootstrap/_retired/dao-ui/base/deployment.yaml`; overlay digest `sha256:574a519a…3605` (0.1.20)
**Issue:** the parked pod spec sets `runAsNonRoot`, uid 65534, `RuntimeDefault` seccomp, read-only root,
no privilege escalation, dropped capabilities, probes and limits, but not
`automountServiceAccountToken: false` (every live pod, e.g. treasury-ui, does), and it pins the
0.1.20 image, not 0.1.33. The re-enable steps run `refresh-digests.sh` and re-add the image entry.
**Impact:** none while torn down (2026-09-28: cluster resources, TLS secret, tunnel rule and CNAME
removed; `sui-dao.meddleware.co.uk` does not answer). Re-enabled as written, the pod would mount a
service account token it never uses.
**Remediation / evidence:** add the field to the manifest as part of re-enabling (the manifest lives in
the workspace, outside this audit's edit scope).

## Section A — Invariant verification matrix

| # | Invariant | Enforced at | Proven by | Status |
| --- | --- | --- | --- | --- |
| I1 | Nothing is signed | no builder imports; wallet used for cap detection only; `suiBoundary` lint | source; lint clean 2026-10-09 | HOLDS (F2) |
| I2 | Chain data is display only | composables → tabs | source | HOLDS (code-only) |
| I3 | Ids only from the recorded deployment; unknown network fails closed | `config.ts` `requireDeployment` | composable tests ("surfaces a missing deployment as an error") | HOLDS |
| I4 | Chain strings inert; links through helpers | no `v-html`; `ExplorerLink` | `explorer-url.test.ts` | HOLDS (F1, F4) |
| I5 | A slower, older read never overwrites a newer one; the cap check is guarded across account and network changes | `latest()` in every composable; `checkGeneration` in `GovernanceTab` | composable tests; the cap check is code-only | HOLDS (F8) |
| I6 | Treasury balance is the total | `useTreasury` | composable tests | HOLDS (F7) |
| I7 | Proposals stub cannot act | `useProposals` returns read-only empties | composable tests ("exposes an empty, readonly list until vault_dao ships") | HOLDS |
| I8 | The commission recipient is shown in full | `TreasuryTab`, `GovernanceTab`, `OverviewTab` (`:truncate="false"`) | source | HOLDS (code-only) — F9 |
| I9 | Money rules shown in text match the contract | `GovernanceTab` footnote | none | GAP — see F14 |
| I10 | The unit tests run on every change and every release | none (`node-ci.yml` has no test step) | none | GAP — see F11 |

### Lens categories

| Lens | Category | Status |
| --- | --- | --- |
| SUI_CLIENT | Package-ID split | HOLDS — reads use `originalId` (types and events, `ownsPlatformAdminCap`); the app has no call target |
| SUI_CLIENT | Read parsing and events | through access-gate-client — full normalised types, strict decoding, cursor paging (bounded to ten calls here), indexer https-only and size-bounded with full-node fallback |
| SUI_CLIENT | Network / chain binding | HOLDS — wallet-adapter's shared selector selects ids and client; the standalone build sets `VITE_NETWORK` once (testnet or mainnet); no signing, so no wallet chain to bind |
| SUI_CLIENT | Value encoding | HOLDS — balance, prices and proposal amounts stay `bigint`; `Number()` only inside display formatters (`AmountCell`, `TreasuryTab`, `ProposalRow`) |
| SUI_CLIENT | Execution result, funds in the PTB, capabilities (irreversible ops), signature verification, dry-run, client-side publish | N/A — nothing is built, signed or executed; the wallet is used only to detect a cap |
| SUI_CLIENT | Chain-access layering | HOLDS — typed reads and the cap check through access-gate-client; the balance read is a generic framework read (`getBalance`, no domain client); `suiBoundary` lint |
| TS | Compiler strictness | HOLDS — `strict: true`, `vue-tsc --noEmit` in CI; `noUncheckedIndexedAccess` is not enabled (the app parses no untrusted data itself); `skipLibCheck: true` hides nothing in `src/` |
| TS | Assertions, validation, money, network I/O, dynamic code | HOLDS — no `any`, `!`, `eval` or `fetch` in `src/`; the app makes no network call of its own |
| TS | Promise handling | HOLDS — the empty `catch` in `useEpoch` is commented and non-security; `checkCaps` maps a failure to the visible "error" state, never to a cap |
| TS | Strictness, exports, `files`, supply chain | HOLDS (F6) — `files` whitelist (`npm pack --dry-run` clean); `npm ci`; audit gate; the unit tests are not run in CI (F11); no `LICENSE` file (F13) |
| VUE | Untrusted rendering | HOLDS (I4) |
| VUE | Colour & links | GAP (latent) — `--warning` as text in an unused rule (F12) |
| VUE | Build-time configuration | HOLDS (F3) — every variable in `.env.example`; defaults match the Dockerfile |
| VUE | Test hooks | N/A — none; no test mode exists |
| VUE | Signing UX | N/A — nothing is signed |
| VUE | Shared-wallet state | HOLDS (I5) — cap check re-runs on account or network change; wallet-standard change events are wallet-adapter's |
| VUE | Browser storage | N/A — none used |
| VUE | Lazy boundaries | N/A — no heavy SDK or wasm |
| VUE | Dual app / library | HOLDS — `DaoView` has no shell chrome and imports its own scoped `qt.css` |
| VUE | Estimates | HOLDS — amounts are read from the chain; the display rounding is a formatter; the commission explanation is not an estimate but is inexact (F14) |
| IMG | Base images, build context, reproducible build, no secrets, runtime user, scan, SBOM and notices | HOLDS (F10) for the built image — digest-pinned `node:24-slim` and static-server 0.1.7; `.dockerignore` excludes `node_modules`, `dist`, `.git`, `.github`, `.env*.local`; `npm ci`; no secret in any `ARG`/`ENV`; Trivy before cosign; lockfile in the image |
| IMG | Verification command | GAP accepted — the identity pins the repository (F17); the image is not deployed |
| IMG | Deployment pinning, pod security | parked — the manifest is read-only root, non-root, no privilege escalation, capabilities dropped, seccomp, but lacks `automountServiceAccountToken: false` and pins 0.1.20 (F19); nothing runs |

## Section B — Supply-chain, publish-authority & capability matrix

### B.1 Dependency & CVE risk

| Dependency | Pinned version | Liveness dependency? | CVE / audit status | Notes |
| --- | --- | --- | --- | --- |
| `@meddleware/access-gate-client` | `^0.0.8` (installed 0.0.8) | every read, cap check | clean 2026-10-09 | latest |
| `@meddleware/wallet-adapter` | peer `>=0.0.12 <0.2.0`; dev `^0.0.17` | client, cap check | own audit | host's copy |
| `@meddleware/ui` / `design-tokens` / `eslint-config` | `^0.1.31` / `^0.1.9` / `^0.0.2` | UI | own audits | latest published |
| `@mysten/sui` | `^2.33.2` (installed 2.35.0) | reads | `npm audit` gate 2026-10-09: only the allowlisted advisory | one copy (`npm ls`); ADR-0001 baseline `^2.33.1` |
| Vue / Vite / TypeScript / vitest | 3.5.43 / 8.3 / 6.0.3 / 5.0.3 (plugin-vue 6.0.9, vue-tsc 3.3.x) | build | clean | TypeScript 7 and vitest 5-major follow-ups declined (decision); Node 24 LTS |
| Sui full node | public gRPC (wallet-adapter) | every panel | Mysten | fails closed (each panel shows its error) |
| Read-indexer (`sui-indexer.meddleware.co.uk`) | https, optional `VITE_INDEXER_URL` | event feed | own audit | display data; falls back to the full node after 3 s |
| `static-server` / `node:24-slim` | 0.1.7 / digest-pinned | runtime / build | Trivy at release (F10); Go 1.26.9 | — |
| dev tooling | lockfile | no | GHSA-vfj7-8cjw-p6xm allowlisted to 2027-01-01 | TS lens B.TS-3 |

Shared-dependency matrix (TS lens): `@mysten/sui` dep `^2.33.2` (baseline `^2.33.1`, within range);
`vue` dep `^3.5.43`; `typescript` dev `~6.0.0`; `vitest` dev `~5.0.2`; `@mysten/wallet-standard`,
`@mysten/walrus`, `@mysten/walrus-wasm`, `@mysten/seal`, `@mysten/bcs`: not used. First-party ranges
are `^0.0.x` (exact) or `^0.1.x` (ui, which resolves to the latest published); no `~0.0.x`; the
wallet-adapter peer range is `>=0.0.12 <0.2.0`, no `legacy-peer-deps`.

Install-time code (TS B.TS-2): the lockfile has one lifecycle script, `fsevents` 2.3.3 (dev, optional,
macOS only); no `allowScripts`, no `overrides`; no `prepare`/`postinstall` in `package.json`. `files`:
`src`, `index.html`, `vite.config.ts`, `tsconfig.json` (and a `CHANGELOG.md` entry that matches no file).

### B.2 Publish authority, capabilities & secret custody

| Authority / secret | Where held | Custody | Gates | Rotation |
| --- | --- | --- | --- | --- |
| npm publish | GitHub Actions | OIDC + provenance; opt-in `NPM_PUBLISH` | library | n/a |
| `QUAY_TOKEN`, `DOCKERHUB_TOKEN` | GitHub secrets | long-lived robot accounts (inventory: `OPERATOR_TASKS.md`) | image push | F18 |
| image signing | GitHub Actions | cosign keyless | images | n/a |

The app holds no key and no capability; the wallet is used only to detect a `PlatformAdminCap`.

CI & release integrity: actions pinned by SHA (workflows read 2026-10-09); explicit `permissions:` per
workflow and job (`id-token`/`attestations` only on the merge-and-sign job, `id-token` only on the npm
publish job); OIDC publish with a tag == version check and an idempotent registry check; npm client
pinned (`npm@11.20.0`); image release = full CI via `workflow_call` + Trivy + cosign + SPDX SBOM
attestation + provenance, multi-arch signed at the merged index digest, no `continue-on-error` on the
public path (F10; the CI workflow lacks the tests, F11; the npm gate is a subset, F16); `npm ci`
everywhere; audit gate in CI and the npm job; Dependabot weekly and grouped for npm, Docker and Actions
(`.github/dependabot.yml`); no test-only build mode exists, so there is nothing to scan for; no job
spends real funds.

### B.VUE-1 Hosting headers

Not served while retired, so no live header read. The image would serve the CSP from the `CSP` build
argument through static-server (`default-src 'self'`, `script-src 'self'` plus a per-response nonce,
`style-src 'self' 'unsafe-inline'`, `connect-src 'self' https:`, `img-src 'self' data: blob: https:`,
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`,
`upgrade-insecure-requests`) with HSTS and the other headers static-server adds; treasury-ui, built from
the same Dockerfile and base, was read live on 2026-10-09 and shows exactly that set. `'unsafe-inline'`
is for styles only; the build emits no inline script. The blanket `https:` is F15. No static host and no
`_headers` file.

### B.VUE-2 Build inputs and artifacts / IMG

`node:24-slim@sha256:0e0ff40c…` builder and `static-server:0.1.7@sha256:2e227311…` runtime, both
digest-pinned (Dependabot Docker group); `npm ci`; `.dockerignore` excludes local installs, build output,
VCS data and every `.env*.local`; `npm run build && npm run licenses` run in the build stage; the runtime
stage copies `dist` and the lockfile only; `USER 65534:65534`; no secret in any `ARG`/`ENV` (the build
args are the public `VITE_NETWORK` and `VITE_INDEXER_URL` values and the CSP); production sourcemaps are
not emitted (Vite default). The parked deployment (`post-bootstrap/_retired/dao-ui`) is read-only root,
`runAsNonRoot` uid 65534, no privilege escalation, all capabilities dropped, `RuntimeDefault` seccomp,
probes and limits, without `automountServiceAccountToken: false` (F19); it is not in `config/images.yaml`
and is not applied by `apply.sh`. Not run: a Trivy *config* scan of the Dockerfile and manifests (F10).

### B.SC-1 ID-constant trace

| Location | Network | Value | original-id or published-at | Matches the latest on-chain version |
| --- | --- | --- | --- | --- |
| access-gate-client 0.0.8 `deployments` (resolved from npm at build; the only source) | testnet | `access_gate` `0xd7ddaa94…88c9` | both (fresh publication 2026-10-09); the app uses `originalId` only | Y — access-gate-sui commit `7906954`; the same deployments record is in the live treasury-ui bundle read 2026-10-09 |
| same | testnet | PlatformConfig `0x3f81489d…e7b5` | n/a (shared object) | Y — same |
| any `VITE_*`, `src/` literal, `.env.example` | any | none | — | Y — grep finds no 0x id in `src/` |
| mainnet, localnet | — | none recorded | — | n/a — `accessGateDeployment` throws; each composable reports it |

dao-ui is not served, so its own bundle cannot be read live; the trace rests on the lockfile
(access-gate-client 0.0.8) and on the identical record in the live treasury-ui bundle.

### B.SC-2 Coupling table

| Move function / event | Reader (access-gate-client) | Test asserting type and fields |
| --- | --- | --- |
| `PlatformConfig` object | `fetchPlatformConfig` | `composables.test.ts` (recorded id; foreign object refused); client tests and weekly schema-drift suite |
| `AdminCap` / `Gate` objects | `fetchAdminCaps`, `fetchGate` | `composables.test.ts` (paging; unreadable gate left out); client tests |
| `PlatformAdminCap` object | `ownsPlatformAdminCap` | client tests; no test here (`GovernanceTab` is a component without tests) |
| `AccessMinted` / `AccessConsumed` events | `listAccessGateEvents` | `composables.test.ts` (consumer vs recipient, look-alike package dropped, paging); client strict-decode tests |

## Section C — Test-coverage & hermetic/live split

### C.1 Coverage grade — B (13/13, 2026-10-09)

Vitest 5.0.3, 2 files: `composables.test.ts` (events, platform config, gates, proposals stub, treasury
balance) and `explorer-url.test.ts`. Event merge and decoding through the real client, gate discovery
and its failure paths, platform config, the proposals stub, explorer links, and the treasury balance
(total, ordering, clearing). No component tests (the cap check in `GovernanceTab` is untested) and no
Playwright suite. Gating variables: none; the suite is hermetic. The suite is not run by `node-ci.yml`
or by the image release (F11); the npm job runs it.

### C.2 Hermetic vs. live paths

| Path | Hermetic? | Deferred to | Tracking |
| --- | --- | --- | --- |
| Composables over a mocked core client | yes | — | `npm test` |
| Live reads | no | testnet | access-gate-client `GRPC_TESTNET` read and drift suites (PASS 2026-10-09 against the new package); re-enabling runbook |
| Browser contrast (axe) of this app's own screens | no | `@meddleware/ui` gallery covers shared components only | F12 |

## Section D — Deployment-readiness gates

### pre-localnet

- [x] builds; type-check, three linters, unit tests green (2026-10-09); no secrets in source
- [x] no `v-html`; every dynamic link through `ExplorerLink`/`safeHref`; no secret `VITE_*`
- [x] `VITE_*` inventory complete and matching `.env.example`

### pre-testnet

- [x] previously deployed with digest pinning and CSP; now retired and torn down (2026-09-28)
- [x] `SECURITY.md` present; F7, F8 fixed
- [x] image (built, not deployed): digest-pinned bases, non-root, signed with SBOM and provenance, scanned before signing (F10)
- [x] consumed IDs are the latest on-chain version — access-gate-client 0.0.8 deployments (B.SC-1)
- [ ] every test project runs in CI — F11 (next patch)
- [ ] commission explanation and capability message match the contract and the check — F14 (next patch, at the latest before re-enabling)
- [ ] colour: no warning text below AA on the light theme — F12 (latent, next patch)

### pre-mainnet

- [ ] re-review when governance (signing) is added — the read-only model no longer holds then (standing condition)
- [ ] re-enable per `post-bootstrap/_retired/README.md`, including `automountServiceAccountToken: false` (F19) — gated on governance being usable
- [ ] `access_gate` mainnet deployment recorded in access-gate-client — mainnet-blocked
- [ ] registry credential inventory and rotation (F18) — `OPERATOR_TASKS.md` "Image registry credentials"
- [ ] external review — maintainer item (`OPERATOR_TASKS.md` "Funding, grants and an external audit")

## Cross-project themes

- **Supply chain & release integrity** — lockfile (also shipped in the image); first-party libraries at
  their latest versions; signed images with SBOM and provenance, Trivy before signing, SHA-pinned
  actions, grouped Dependabot; expiring audit allowlist; publish authority in B.2.
- **Wire-format coupling** — none here: events and objects are decoded in access-gate-client.
- **On-chain-truth boundary** — read-only; commission and caps are the contract's; the one place the
  app restates a money rule in text is inexact (F14).
- **Deployment readiness** — Section D.
- **Chain-access layering** — all reads and the cap check through access-gate-client; the balance read
  is the one direct core call (`getBalance`), which has no domain client; the `suiBoundary` lint enforces
  the rest. IDs consumed: B.SC-1.

## Normative requirements (MUST / MUST NOT)

- **SC-M1–SC-M10** — hold through access-gate-client (SC-M3, SC-M6 to SC-M9 are N/A: nothing is signed
  or executed). SC-M1: reads use `originalId` from the recorded deployment. SC-M5: network, ids and
  client follow one selector; missing ids fail closed.
- **TS-M1–TS-M9** — hold. TS-M9: `@mysten/sui` is a single copy; wallet-adapter is a peer. The lens's
  Section C rule that every test project runs in CI is not met (F11).
- **VUE-M1–VUE-M9** — hold (VUE-M3, M4, M5, M7 N/A: no test hooks, signing or storage); the *Colour &
  links* category has one latent defect (F12) and the on-chain-truth text one inexact statement (F14).
- **IMG-M1–IMG-M8** — hold for the built image; IMG-M5 for the parked manifest lacks one field (F19);
  IMG-M8's verification command pins the repository only (F17).

## Implementation suggestions (SHOULD / MAY)

- MAY format amounts with exact bigint arithmetic (`AmountCell`, `TreasuryTab`, `ProposalRow` use
  `Number(mist) / 1e9` rounded to 4 decimals — display only, imprecise above 2^53 MIST).
- SHOULD guard `ProposalRow`'s percentage against a zero target when proposals become real (today the
  list is always empty).
- SHOULD remove the unused signing intent from `src/wallet.ts` (it requests the
  `sui:signPersonalMessage` feature although nothing is signed) before the app is re-enabled.
- MAY add a test for the `GovernanceTab` cap check (found, not found, error, account switch).

## Open questions (`OQ#`)

- **OQ1** — (Decided 2026-09-18: `suiExplorerUrl` scheme is fixed and `ExplorerLink` uses `safeHref` —
  see F4.)
- **OQ2** — (Decided 2026-09-18: `AccessBurned` is not listed by design; no security impact — see F5.)

## Risks

- **Full-node and indexer liveness** — the console shows errors per panel when reads fail.
- **Retired** — not hosted; npm releases and image builds continue so the dashboard's dependency stays
  aligned, which means the maintenance cost (F11 to F13) continues without a user.
- **Registry tokens** — long-lived robot tokens for image pushes (F18).

## Re-verification log

- 2026-09-18 — first-pass baseline (F1–F6).
- 2026-09-30 — B3: reads, events and ids through access-gate-client; network from wallet-adapter.
- 2026-10-03 — re-verified under AUDIT_TEMPLATE.md + SUI_CLIENT + TS + VUE + IMG (Phase 7): front
  matter, lens sections and four-part closing added. F7, F8 RESOLVED in 0.1.27 (with
  access-gate-client 0.0.4, wallet-adapter dev 0.0.13, env ignores). Counts: 13/13.
- 2026-10-03 — 0.1.28: the footer's dev link pointed at a non-existent `/sui/dao/` page; it now opens the Access Gate developer guide (docs audit F12).
- 2026-10-08 — Lens dates reconciled with the registry (`check-template-dates.mjs`): base 2026-10-08, and SUI_CLIENT/GO 2026-10-08 and TS 2026-10-03 where cited. The changes (AUTH/PLATFORM/MCP/DB registered, the GO token row moved to AUTH, JSR in trusted publishing, layered injection guards) alter no disposition here.
- 2026-10-09 — re-verified against 0.1.33 (releases 0.1.29 to 0.1.33), retired app: every finding
  re-checked against the code, tests, workflows, the parked manifests, the dashboard router and the
  quay.io tag list. Template dates now cite the registry (VUE, TS, IMG 2026-10-08), with the new VUE
  *Colour & links* category and the IMG extensions applied. Front matter gained the lens fields (build
  tool, hosting, VITE_* inventory, images, base images, runtime user) and a current deployment status
  (0.1.33, retired since 2026-09-28). F1 to F8 re-confirmed (F3: republished deployment). New: F9
  (treasury address in full, RESOLVED 0.1.30), F10 (release gate, Trivy, lockfile, notices,
  `USER 65534`, RESOLVED 0.1.32–0.1.33), F11 (unit tests not run in CI or the release gate since
  `d67c5e5`, DEFERRED), F12 (`--warning` as text in an unused rule, DEFERRED; design-tokens F10), F13
  (no `LICENSE` file, DEFERRED), F14 (Governance tab misstates the commission rule and the cap check,
  DEFERRED), F15 (blanket `connect-src`, ACCEPTED-RISK), F16 (npm gate subset, ACCEPTED-RISK), F17
  (cosign identity, ACCEPTED-RISK), F18 (registry credentials, DEFERRED maintainer), F19 (parked
  manifest lacks `automountServiceAccountToken: false`, DEFERRED to re-enabling). Section A gained I8
  to I10 and the lens categories; B.SC-1, B.SC-2 and the shared-dependency matrix added; D gates
  updated. Counts: 19 findings — 5 RESOLVED (F6–F10), 4 Positive (F1, F2, F3, F5), 1 ADJUDICATED (F4),
  3 ACCEPTED-RISK (F15–F17), 6 DEFERRED (F11–F14 next patch; F18 maintainer; F19 re-enable gate);
  tests 13/13, `vue-tsc`, three linters and the audit gate green.
