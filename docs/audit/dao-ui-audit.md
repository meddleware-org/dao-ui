# Security Audit — `dao-ui`

**Classification:** Internal security review
**Project:** `repos/dao-ui` — `@meddleware/dao-ui`, Vue 3 DAO console (overview, treasury, governance, history, proposals; standalone SPA + `DaoView` library)
**Project type:** Vue app + UI library
**Template:** AUDIT_TEMPLATE.md (2026-10-08) + AUDIT_TEMPLATE_SUI_CLIENT.md (2026-10-08) + AUDIT_TEMPLATE_TS.md (2026-10-08) + AUDIT_TEMPLATE_VUE.md (2026-10-08) + AUDIT_TEMPLATE_IMG.md (2026-10-08)
**Sui SDK:** `@mysten/sui ^2.33.2` (installed 2.35.0, one copy; `npm ls` single version)   **Transport:** gRPC through wallet-adapter; optional read-indexer over HTTPS
**Networks:** testnet (recorded deployment); any other network reports "no deployment" instead of querying
**On-chain packages consumed:** `access_gate` (reads only) through `@meddleware/access-gate-client/deployments` (0.0.9, same records as 0.0.8: testnet `0xd7ddaa94…88c9`, PlatformConfig `0x3f81489d…e7b5`; reads use `originalId`)
**Package manager / lockfile:** npm 11, committed (also copied into the image for SBOM tools)   **Module format / publish model:** ESM; ships source (library) + SPA image
**Runtime targets:** browser   **Peer dependencies:** `@meddleware/wallet-adapter >=0.0.12 <0.2.0`
**Build tool:** vite 8.3, `@vitejs/plugin-vue` 6.0.9, vue 3.5.43, vue-tsc 3.3.x, TypeScript 6.0.3, vitest 5.0.3 (as installed 2026-10-18)
**Hosting:** none while retired; the image is built to serve on static-server (CSP and HSTS from the server); no static-host `_headers` file
**Embedding hosts:** the dashboard — the `DaoView` route is commented out (`dashboard/src/router/index.ts`) though `@meddleware/dao-ui ^0.1.32` stays a dependency
**VITE_\* inventory:** `VITE_NETWORK` (testnet|mainnet, baked, selects the network only), `VITE_INDEXER_URL` (optional read-indexer base URL, baked, display data), `VITE_DOCS_URL` / `VITE_DEV_URL` (footer links, baked); all public, none selects an on-chain id; all four are in `.env.example`
**Images:** `quay.io/meddleware-org/dao-ui:0.1.34@sha256:ca085d6f5421df3268c7736257d190a00bbd136db1e14a6e24f84dd1f729bead` (published 2026-10-18 on the `v0.1.34` tag, commit `3edca2a`; cosign keyless signature verified 2026-10-18 against the workflow-anchored identity; **not deployed**, so outside the deployed-image set of `verify-digests.sh`); superseded 0.1.33 was `sha256:07656932…c685` (published 2026-10-09); last deployed `0.1.20@sha256:574a519a…3605` (still pinned in the parked overlay)
**Base images:** build `node:24-slim@sha256:0e0ff40c…f9b6`; runtime `quay.io/meddleware-org/static-server:0.1.8@sha256:e32cf42b…4000` (0.1.7 until 0.1.33; 0.1.34 published on it; tag read from the quay.io API 2026-10-18)
**Runtime user:** `USER 65534:65534`   **Runtime FS:** read-only root in the parked manifest, no writable mounts
**Deployed by:** nothing — parked at `post-bootstrap/_retired/dao-ui/overlays/default`; not in `config/images.yaml`; `sui-dao.meddleware.co.uk` is gone (no response 2026-10-09)
**Build args:** `VITE_NETWORK`, `VITE_INDEXER_URL` and `CSP` — none secret, none a test switch
**Deployment status:** npm v0.1.34 published (2026-10-18; v0.1.33 on 2026-10-09) and the 0.1.34 image published and signature-verified (2026-10-18, `sha256:ca085d6f…bead`; release tag `v0.1.34` = `3edca2a`) — **published, not deployed**. **Retired from hosting** since 2026-09-28 — `post-bootstrap/_retired/dao-ui`, torn down, not in `config/images.yaml`, dashboard route commented out (until governance is usable); the image still builds and is signed on tags.
**Review date:** 2026-09-18 (first pass) · re-verified 2026-10-03 · re-verified 2026-10-09 · fixes 2026-10-18 (0.1.34, published, not deployed)
**Reviewer:** Internal review
**Severity ceiling:** Low — read-only: nothing is signed; a wallet is used only to detect a `PlatformAdminCap`.
**Status:** re-verified 2026-10-09; F11–F14, F16 and F20 fixed in 0.1.34 (2026-10-18, commit `7857e2e`); 0.1.34 published (npm and image, signature verified) 2026-10-18 and not deployed (retired)

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
- The newly applicable lens checks found five defects (recorded then as not yet fixed; four are fixed
  in 0.1.34, see below): **F11 (Low)** the unit tests were not run by the release gate; **F12 (Info)**
  `qt.css` drew `--warning` as text (2.0:1 on the light canvas, design-tokens audit F10) in a rule no
  component used; **F13 (Info)** the package declared 0BSD but shipped no `LICENSE` file; **F14
  (Low)** the Governance tab's explanation of the commission rule and its capability message did not
  match the contract and the check; **F19 (Info, DEFERRED)** the parked manifest lacks
  `automountServiceAccountToken: false`.
- Accepted or maintainer items: **F15** blanket `connect-src https:` (ACCEPTED-RISK), **F17** the
  cosign identity pins the repository not the workflow (ACCEPTED-RISK), **F18** registry mirror and
  credential inventory (DEFERRED, maintainer).

Fix wave 2026-10-18 (0.1.34, commit `7857e2e`; published 2026-10-18, not deployed): **F11 RESOLVED** (the unit tests run in
`node-ci.yml` since `4155034`; the npm job's `verify` now calls that workflow), **F12 RESOLVED** (the
unused rule is deleted; `design-tokens-used.test.ts` pins it), **F13 RESOLVED** (`LICENSE` added),
**F14 RESOLVED** (the Governance tab states the contract's rule, shows the live minimum commission and
names only `PlatformAdminCap`; the check itself was right; `governance-tab.test.ts`), **F16
RESOLVED** (same workflow call as F11), and a new **F20 (Info, RESOLVED)** that the new token test
found: `App.vue` read the undefined `--font-mono`. Dependencies moved to access-gate-client 0.0.9
(same recorded deployment) and design-tokens 0.1.10; the image base is static-server 0.1.8.

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
it (including the unit tests since `4155034`, F11); the merge-and-sign job builds per architecture, merges the manifest,
runs Trivy on the merged digest (CRITICAL/HIGH, fixable only, `exit-code: 1`) before `cosign sign`, then
an SPDX SBOM attestation and build provenance for quay.io and Docker Hub, with no `continue-on-error`
on the public path (the workflow is identical to treasury-ui's apart from the image name); the
Dockerfile runs `npm run licenses` in the build stage and copies `package-lock.json` to
`/usr/share/doc/dao-ui/`; CI runs `check:licenses`; the runtime base is static-server 0.1.7 (Go 1.26.9; 0.1.8 from 0.1.34)
with an explicit `USER 65534:65534`; the 0.1.33 tag exists on quay.io (read 2026-10-09). Not run: a
Trivy *config* scan of the Dockerfile and manifests. The signature of the 0.1.33 image was not
re-verified because `verify-digests.sh` covers deployed images only; the 0.1.34 image (`sha256:ca085d6f…bead`) was published and its cosign signature verified against the workflow-anchored identity on 2026-10-18.

### F11 — Unit tests are not run by CI or by the release gate

**Severity:** Low   **Disposition:** RESOLVED (0.1.34 for the npm gate; the CI step landed in `4155034`, commit `7857e2e` for this release)
**Where:** `.github/workflows/node-ci.yml`; `docker-publish.yml` and `npm-publish.yml` `verify`
**Issue:** as found 2026-10-09, `node-ci.yml` had no `npm test` step, so the image release (which calls
it since `d67c5e5`) ran no unit tests; only the npm job's own `verify` did. TS lens: every test project
that exists runs in CI.
**Impact:** a regression in the composables could merge and be released as an image without any gate
failing. Low weight while the app is retired.
**Remediation / evidence:** `node-ci.yml` has an `Unit tests` step (`npm test`, from `4155034`;
re-read 2026-10-18), and the comment in `docker-publish.yml` is now true. `npm-publish.yml`'s `verify`
now calls `./.github/workflows/node-ci.yml` (as access-gate-ui's does), so both release paths run the
same full set. The suite is 38 tests in 4 files (2026-10-18).

### F12 — `--warning` drawn as text in an unused rule

**Severity:** Info   **Disposition:** RESOLVED (0.1.34, commit `7857e2e`; `tests/design-tokens-used.test.ts`)
**Where:** `src/styles/qt.css` (`.dao-notice { border/color: var(--warning); background: color-mix(… var(--warning) 10% …) }`, removed)
**Issue:** `--warning` is the bright yellow fill (2.0:1 on the light canvas). The rule drew it as text
(design-tokens audit F2, F10; treasury-ui had the same rule). No component used `.dao-notice`, so the
defect was latent. The stylesheet is exported with `DaoView`.
**Impact:** none while unused; a future warning notice would have been hard to read in the light theme
(VUE lens *Colour & links*, WCAG AA 4.5:1).
**Remediation / evidence:** the unused rule is deleted. `design-tokens-used.test.ts` (as in treasury-ui)
fails for any component or stylesheet that sets `color: var(--warning)` and for any custom property the
app reads that design-tokens does not define (see F20). Browser contrast of this app's own screens is
still not checked per theme and season.

### F13 — No `LICENSE` file although the package declares 0BSD

**Severity:** Info   **Disposition:** RESOLVED (0.1.34, commit `7857e2e`; `LICENSE`)
**Where:** repository root; `package.json` (`"license": "0BSD"`); `npm pack --dry-run`
**Issue:** the repository had no `LICENSE` file, so the published tarball carried only the SPDX id.
**Impact:** documentation and tooling only: licence scanners and consumers read the file; 0BSD asks for
no attribution, and the image serves the bundled dependencies' notices (F10).
**Remediation / evidence:** `LICENSE` (the 0BSD text, byte-identical to access-gate-ui's) added;
`npm pack --dry-run` 2026-10-18 lists `LICENSE` and `CHANGELOG.md` (29 files).

### F14 — The Governance tab misstates the commission rule and the capability check

**Severity:** Low   **Disposition:** RESOLVED (0.1.34, commit `7857e2e`; `tests/governance-tab.test.ts`)
**Where:** `src/tabs/GovernanceTab.vue` (footnote in *Platform Parameters*; the "not-found" message in *Admin Actions*); `README.md`; `src/composables/usePlatformConfig.ts`
**Issue:** (1) the footnote said commission is `commission_bps / 10000 × price`. The contract pays
`max(price × commission_bps / 10000, min_commission_mist)`, never more than 10% of the price
(`access_gate.move` header and `commission_for_price`; access-gate-client `commissionForPrice`), under
the gate's freeze-time snapshot if it locked one. (2) the "not-found" message said the wallet holds
neither `PlatformAdminCap` nor `DaoAdminCap`, but `ownsPlatformAdminCap` checks only `PlatformAdminCap`.
**Impact:** an operator reading the tab could expect a lower commission on cheap gates than the contract
charges. Display only: nothing is signed and the contract enforces the real rule.
**Remediation / evidence:** read against `access-gate-sui/sources/access_gate.move` (lines 75–86, 195,
712–722) and the client README 2026-10-18. The check was right (`access_gate` has no `DaoAdminCap`; the
`PlatformAdminCap` is the only authority over `PlatformConfig`), so only the texts changed: the footnote
now states the max-of-percentage-and-minimum rule, the 10% cap and the locked terms; a *Minimum
commission* row shows `min_commission_mist` read live from `PlatformConfig` (`usePlatformConfig` returns
`minCommissionMist`); the message names `PlatformAdminCap` only; README and CLAUDE.md say the same.
`governance-tab.test.ts` mounts the tab over the real client: the rule text, the live minimum
(`1000000 MIST (0.001 SUI)`), the message with no `DaoAdminCap`, the owned-objects query for
`<originalId>::access_gate::PlatformAdminCap`, and a failed check shown as "Unable to verify", never as
a missing cap.

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
**Note (2026-10-18):** no single fix exists while the RPC, relay and indexer hosts are operator-configured; the narrowing (an explicit host list per deployment) belongs to re-enabling, so the disposition stays.

### F16 — The npm publish gate is a subset of CI

**Severity:** Low   **Disposition:** RESOLVED (0.1.34, commit `7857e2e`; was ACCEPTED-RISK)
**Where:** `.github/workflows/npm-publish.yml`
**Issue:** (as found 2026-10-09) the npm job's `verify` ran `npm ci`, the audit gate, type-check and the unit tests, not the
full CI workflow (linters, licence check). The image release (F10) does run the full workflow on the
same tag.
**Impact:** a tag could publish the source package while the image job refuses the same commit. The
package is source only (`npm pack --dry-run` 2026-10-09: 22 `src` files, `index.html`, `vite.config.ts`,
`tsconfig.json`, README; no tests, fixtures or `.env*`).
**Remediation / evidence:** closed 2026-10-18: `npm-publish.yml`'s `verify` job now calls
`./.github/workflows/node-ci.yml` (as access-gate-ui's does), so the package and the image gate on the
same checks. The publish itself stays OIDC with provenance, tag == version checked, idempotent, and gated
on the `NPM_PUBLISH` variable.

### F17 — The cosign identity pins the repository, not the workflow

**Severity:** Info   **Disposition:** ACCEPTED-RISK
**Where:** `bootstrap/images/verify-digests.sh` (workspace); this repository publishes no verify command
**Issue:** the cluster check accepts any workflow identity of `github.com/meddleware-org/dao-ui`.
**Impact:** a workflow added by someone with write access could sign an image the check would accept;
moot while the image is not deployed and therefore not checked.
**Remediation / evidence:** the repository is the signing boundary. The workspace script's default identity became
workflow-anchored on 2026-10-18 (`^https://github\.com/meddleware-org/${name}/\.github/workflows/docker-publish\.yml@refs/tags/v`;
all 16 deployed and contingency images verified valid against it), but `dao-ui` is parked under `post-bootstrap/_retired/`
and is not in `config/images.yaml`, so `verify-digests.sh` does not check this image and the disposition is unchanged.
The new default applies automatically to the `dao-ui` entry when the app is re-enabled and added to `config/images.yaml`
(F19); the 0.1.34 image's signature was verified by hand against the workflow-anchored identity on 2026-10-18.
Close this finding when the first cluster check of a re-enabled `dao-ui` passes against the default.

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
**Remediation / evidence:** the manifest lives in the workspace, outside this repository, so it is not
edited here. On re-enable, change exactly this (2026-10-18): (1) in `post-bootstrap/_retired/dao-ui/base/deployment.yaml`,
under the pod template `spec:` (beside the pod `securityContext`), add `automountServiceAccountToken: false`;
(2) move the directory back to `post-bootstrap/dao-ui/`, add the `dao-ui` entry to `config/images.yaml`, and
run `bootstrap/images/refresh-digests.sh` then `sync-manifests.sh`, which replace the overlay's pinned
0.1.20 digest (`sha256:574a519a…3605`) with the current release (0.1.34 or later; check
`https://quay.io/api/v1/repository/meddleware-org/dao-ui/tag/`); (3) the other steps of
`post-bootstrap/_retired/README.md`. Nothing else in the pod spec needs to change.

### F20 — `App.vue` read an undefined custom property

**Severity:** Info   **Disposition:** RESOLVED (0.1.34, commit `7857e2e`; `tests/design-tokens-used.test.ts`)
**Where:** `src/App.vue` (the network badge's `font-family: var(--font-mono)`)
**Issue:** design-tokens defines `--mw-font-mono`, not `--font-mono`; the undefined name made the badge
fall back to the inherited font. Found by the new token test (it checks that every custom property the
sources read is defined by design-tokens or by the file itself).
**Impact:** cosmetic: the badge was not set in the monospace face.
**Remediation / evidence:** `var(--mw-font-mono)` (as `qt.css` and `ProposalRow` use); the test passes
for every `.vue` and `.css` file under `src/`.

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
| I9 | Money rules shown in text match the contract | `GovernanceTab` footnote and *Minimum commission* row (`min_commission_mist` read live) | `governance-tab.test.ts` | HOLDS (F14) |
| I10 | The unit tests run on every change and every release | `node-ci.yml` `Unit tests` step; both release workflows call it | workflows read 2026-10-18 | HOLDS (F11) |

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
| TS | Strictness, exports, `files`, supply chain | HOLDS (F6) — `files` whitelist (`npm pack --dry-run` clean); `npm ci`; audit gate; unit tests in CI and in both release gates (F11); `LICENSE` shipped (F13) |
| VUE | Untrusted rendering | HOLDS (I4) |
| VUE | Colour & links | HOLDS (F12, F20) — the unused `--warning`-as-text rule is gone; `design-tokens-used.test.ts` pins both it and the defined-property check |
| VUE | Build-time configuration | HOLDS (F3) — every variable in `.env.example`; defaults match the Dockerfile |
| VUE | Test hooks | N/A — none; no test mode exists |
| VUE | Signing UX | N/A — nothing is signed |
| VUE | Shared-wallet state | HOLDS (I5) — cap check re-runs on account or network change; wallet-standard change events are wallet-adapter's |
| VUE | Browser storage | N/A — none used |
| VUE | Lazy boundaries | N/A — no heavy SDK or wasm |
| VUE | Dual app / library | HOLDS — `DaoView` has no shell chrome and imports its own scoped `qt.css` |
| VUE | Estimates | HOLDS — amounts are read from the chain; the display rounding is a formatter; the commission explanation states the contract's rule (F14) |
| IMG | Base images, build context, reproducible build, no secrets, runtime user, scan, SBOM and notices | HOLDS (F10) for the built image — digest-pinned `node:24-slim` and static-server 0.1.8; `.dockerignore` excludes `node_modules`, `dist`, `.git`, `.github`, `.env*.local`; `npm ci`; no secret in any `ARG`/`ENV`; Trivy before cosign; lockfile in the image |
| IMG | Verification command | GAP accepted — the identity pins the repository (F17); the image is not deployed |
| IMG | Deployment pinning, pod security | parked — the manifest is read-only root, non-root, no privilege escalation, capabilities dropped, seccomp, but lacks `automountServiceAccountToken: false` and pins 0.1.20 (F19); nothing runs |

## Section B — Supply-chain, publish-authority & capability matrix

### B.1 Dependency & CVE risk

| Dependency | Pinned version | Liveness dependency? | CVE / audit status | Notes |
| --- | --- | --- | --- | --- |
| `@meddleware/access-gate-client` | `^0.0.9` (installed 0.0.9) | every read, cap check | clean 2026-10-18 | latest |
| `@meddleware/wallet-adapter` | peer `>=0.0.12 <0.2.0`; dev `^0.0.17` | client, cap check | own audit | host's copy |
| `@meddleware/ui` / `design-tokens` / `eslint-config` | `^0.1.31` / `^0.1.10` / `^0.0.2` | UI | own audits | latest published (`npm view`, 2026-10-18) |
| `@mysten/sui` | `^2.33.2` (installed 2.35.0) | reads | `npm audit` gate 2026-10-09: only the allowlisted advisory | one copy (`npm ls`); ADR-0001 baseline `^2.33.1` |
| Vue / Vite / TypeScript / vitest | 3.5.43 / 8.3 / 6.0.3 / 5.0.3 (plugin-vue 6.0.9, vue-tsc 3.3.x) | build | clean | TypeScript 7 and vitest 5-major follow-ups declined (decision); Node 24 LTS |
| Sui full node | public gRPC (wallet-adapter) | every panel | Mysten | fails closed (each panel shows its error) |
| Read-indexer (`sui-indexer.meddleware.co.uk`) | https, optional `VITE_INDEXER_URL` | event feed | own audit | display data; falls back to the full node after 3 s |
| `static-server` / `node:24-slim` | 0.1.8 / digest-pinned | runtime / build | Trivy at release (F10); Go 1.26.9 | — |
| dev tooling | lockfile | no | GHSA-vfj7-8cjw-p6xm allowlisted to 2027-01-01 | TS lens B.TS-3 |

Shared-dependency matrix (TS lens): `@mysten/sui` dep `^2.33.2` (baseline `^2.33.1`, within range);
`vue` dep `^3.5.43`; `typescript` dev `~6.0.0`; `vitest` dev `~5.0.2`; `@mysten/wallet-standard`,
`@mysten/walrus`, `@mysten/walrus-wasm`, `@mysten/seal`, `@mysten/bcs`: not used. First-party ranges
are `^0.0.x` (exact) or `^0.1.x` (ui, which resolves to the latest published); no `~0.0.x`; the
wallet-adapter peer range is `>=0.0.12 <0.2.0`, no `legacy-peer-deps`.

Install-time code (TS B.TS-2): the lockfile has one lifecycle script, `fsevents` 2.3.3 (dev, optional,
macOS only); no `allowScripts`, no `overrides`; no `prepare`/`postinstall` in `package.json`. `files`:
`src`, `index.html`, `vite.config.ts`, `tsconfig.json`, `CHANGELOG.md` (since 0.1.34), plus the always-included `LICENSE`, `README.md` and `package.json`.

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
public path (F10; the CI workflow runs the tests, F11; the npm gate is the same workflow, F16); `npm ci`
everywhere; audit gate in CI (called by both release workflows); Dependabot weekly and grouped for npm, Docker and Actions
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

`node:24-slim@sha256:0e0ff40c…` builder and `static-server:0.1.8@sha256:e32cf42b…` runtime, both
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
| access-gate-client 0.0.9 `deployments` (resolved from npm at build; the only source; records identical to 0.0.8) | testnet | `access_gate` `0xd7ddaa94…88c9` | both (fresh publication 2026-10-09); the app uses `originalId` only | Y — access-gate-sui commit `7906954`; the same deployments record is in the live treasury-ui bundle read 2026-10-09 |
| same | testnet | PlatformConfig `0x3f81489d…e7b5` | n/a (shared object) | Y — same |
| any `VITE_*`, `src/` literal, `.env.example` | any | none | — | Y — grep finds no 0x id in `src/` |
| mainnet, localnet | — | none recorded | — | n/a — `accessGateDeployment` throws; each composable reports it |

dao-ui is not served, so its own bundle cannot be read live; the trace rests on the lockfile
(access-gate-client 0.0.9) and on the identical record in the live treasury-ui bundle.

### B.SC-2 Coupling table

| Move function / event | Reader (access-gate-client) | Test asserting type and fields |
| --- | --- | --- |
| `PlatformConfig` object | `fetchPlatformConfig` | `composables.test.ts` (recorded id, incl. `minCommissionMist`; foreign object refused); `governance-tab.test.ts` (rule text and live minimum); client tests and weekly schema-drift suite |
| `AdminCap` / `Gate` objects | `fetchAdminCaps`, `fetchGate` | `composables.test.ts` (paging; unreadable gate left out); client tests |
| `PlatformAdminCap` object | `ownsPlatformAdminCap` | client tests; `governance-tab.test.ts` (owned-objects query type, not-found message, failure shown as unverified) |
| `AccessMinted` / `AccessConsumed` events | `listAccessGateEvents` | `composables.test.ts` (consumer vs recipient, look-alike package dropped, paging); client strict-decode tests |

## Section C — Test-coverage & hermetic/live split

### C.1 Coverage grade — B (38/38, 2026-10-18)

Vitest 5.0.3, 4 files: `composables.test.ts` (events, platform config, gates, proposals stub, treasury
balance), `explorer-url.test.ts`, `design-tokens-used.test.ts` (21 cases: no `--warning` text colour, every
custom property defined) and `governance-tab.test.ts` (4 cases: commission rule text, live minimum, cap
message, failed check). Event merge and decoding through the real client, gate discovery and its failure
paths, platform config, the proposals stub, explorer links, and the treasury balance (total, ordering,
clearing). The cap check's found / account-switch paths and the `GovernanceTab` "found" state are still
untested, and there is no Playwright suite. Gating variables: none; the suite is hermetic. The suite runs
in `node-ci.yml`, which both release workflows call (F11).

### C.2 Hermetic vs. live paths

| Path | Hermetic? | Deferred to | Tracking |
| --- | --- | --- | --- |
| Composables over a mocked core client | yes | — | `npm test` |
| Live reads | no | testnet | access-gate-client `GRPC_TESTNET` read and drift suites (PASS 2026-10-09 against the new package); re-enabling runbook |
| Browser contrast (axe) of this app's own screens | no | `@meddleware/ui` gallery covers shared components only | F12 (token test covers the known defect only) |

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
- [x] every test project runs in CI — F11: `node-ci.yml` runs `npm test` (`4155034`); `npm-publish.yml` `verify` calls it (0.1.34, commit `7857e2e`)
- [x] commission explanation and capability message match the contract and the check — F14: 0.1.34 (commit `7857e2e`), `governance-tab.test.ts`
- [x] colour: no warning text below AA on the light theme — F12: rule deleted, `design-tokens-used.test.ts` (0.1.34, commit `7857e2e`)

### pre-mainnet

- [ ] re-review when governance (signing) is added — the read-only model no longer holds then (standing condition)
- [ ] re-enable per `post-bootstrap/_retired/README.md`, including `automountServiceAccountToken: false` (F19: the exact change is recorded there) — gated on governance being usable
- [ ] `access_gate` mainnet deployment recorded in access-gate-client — mainnet-blocked
- [ ] registry credential inventory and rotation (F18) — `OPERATOR_TASKS.md` "Image registry credentials"
- [ ] external review — maintainer item (`OPERATOR_TASKS.md` "Funding, grants and an external audit")

## Cross-project themes

- **Supply chain & release integrity** — lockfile (also shipped in the image); first-party libraries at
  their latest versions; signed images with SBOM and provenance, Trivy before signing, SHA-pinned
  actions, grouped Dependabot; expiring audit allowlist; publish authority in B.2.
- **Wire-format coupling** — none here: events and objects are decoded in access-gate-client.
- **On-chain-truth boundary** — read-only; commission and caps are the contract's; the one place the
  app restates a money rule in text now matches the contract and is test-pinned (F14).
- **Deployment readiness** — Section D.
- **Chain-access layering** — all reads and the cap check through access-gate-client; the balance read
  is the one direct core call (`getBalance`), which has no domain client; the `suiBoundary` lint enforces
  the rest. IDs consumed: B.SC-1.

## Normative requirements (MUST / MUST NOT)

- **SC-M1–SC-M10** — hold through access-gate-client (SC-M3, SC-M6 to SC-M9 are N/A: nothing is signed
  or executed). SC-M1: reads use `originalId` from the recorded deployment. SC-M5: network, ids and
  client follow one selector; missing ids fail closed.
- **TS-M1–TS-M9** — hold. TS-M9: `@mysten/sui` is a single copy; wallet-adapter is a peer. The lens's
  Section C rule that every test project runs in CI is met (F11).
- **VUE-M1–VUE-M9** — hold (VUE-M3, M4, M5, M7 N/A: no test hooks, signing or storage); the *Colour &
  links* category and the on-chain-truth text are clean since 0.1.34 (F12, F14, F20).
- **IMG-M1–IMG-M8** — hold for the built image; IMG-M5 for the parked manifest lacks one field (F19);
  IMG-M8's verification command pins the repository only (F17).

## Implementation suggestions (SHOULD / MAY)

- MAY format amounts with exact bigint arithmetic (`AmountCell`, `TreasuryTab`, `ProposalRow` use
  `Number(mist) / 1e9` rounded to 4 decimals — display only, imprecise above 2^53 MIST).
- SHOULD guard `ProposalRow`'s percentage against a zero target when proposals become real (today the
  list is always empty).
- SHOULD remove the unused signing intent from `src/wallet.ts` (it requests the
  `sui:signPersonalMessage` feature although nothing is signed) before the app is re-enabled.
- MAY extend `governance-tab.test.ts` to the cap check's found state and an account switch (the not-found and error states are covered since 0.1.34).

## Open questions (`OQ#`)

- **OQ1** — (Decided 2026-09-18: `suiExplorerUrl` scheme is fixed and `ExplorerLink` uses `safeHref` —
  see F4.)
- **OQ2** — (Decided 2026-09-18: `AccessBurned` is not listed by design; no security impact — see F5.)

## Risks

- **Full-node and indexer liveness** — the console shows errors per panel when reads fail.
- **Retired** — not hosted; npm releases and image builds continue so the dashboard's dependency stays
  aligned, which means the maintenance cost (dependency bumps, release gates) continues without a user.
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
- 2026-10-18 — fix wave (0.1.34, local commit `7857e2e`): access-gate-client ^0.0.9 (deployments
  unchanged), design-tokens ^0.1.10, static-server 0.1.8 (`sha256:e32cf42b…4000`, verified on the quay.io
  API); every first-party dependency is at its `npm view` latest. F11 RESOLVED (tests in `node-ci.yml`
  since `4155034`; `npm-publish.yml` `verify` calls it), F12 RESOLVED (unused `.dao-notice` rule deleted,
  `design-tokens-used.test.ts`), F13 RESOLVED (`LICENSE`), F14 RESOLVED (rule text, live minimum
  commission, `PlatformAdminCap`-only message; `governance-tab.test.ts`), F16 RESOLVED (same workflow
  call), F20 added and RESOLVED (`--font-mono` -> `--mw-font-mono`). F15 stays ACCEPTED-RISK (hosts are
  operator-configured), F17 stays ACCEPTED-RISK (workspace script), F18 maintainer, F19 stays DEFERRED
  with the exact re-enable edit recorded. `CHANGELOG.md` created. Counts: 20 findings — 11 RESOLVED
  (F6–F14, F16, F20), 4 Positive (F1, F2, F3, F5), 1 ADJUDICATED (F4), 2 ACCEPTED-RISK (F15, F17),
  2 DEFERRED (F18 maintainer; F19 re-enable gate); tests 38/38, type-check, `lint:css/js/html`,
  build, `check:licenses` and the audit gate green.
- 2026-10-18 — published, not deployed (`v0.1.34` = `3edca2a`, npm 0.1.34 and image `0.1.34@sha256:ca085d6f5421df3268c7736257d190a00bbd136db1e14a6e24f84dd1f729bead`). Cosign keyless signature verified against the workflow-anchored identity; the app stays retired from the cluster (parked under `post-bootstrap/_retired/dao-ui`, not in `config/images.yaml`, no rollout), so there is no live check and no live header read. F19 (re-enable edit) and F18 (maintainer) unchanged; re-enabling stays gated on governance being usable.
- 2026-10-18 — cosign identity (F17) stays ACCEPTED-RISK: the default identity in `bootstrap/images/verify-digests.sh` is now workflow-anchored (`^https://github\.com/meddleware-org/${name}/\.github/workflows/docker-publish\.yml@refs/tags/v`; 16/16 deployed and contingency images valid), but this image is not in `config/images.yaml` (retired), so the script does not verify it; the finding closes with the first cluster check after re-enable (F19). Counts unchanged.
- 2026-10-19 — dependency-bot status checked (read-only): `.github/dependabot.yml` carries the `ignore` rules and the repository has no open Dependabot pull requests (`gh pr list`, 2026-10-19). Versions, findings and gates were not re-examined in this pass.
  - `Dockerfile` on GitHub `main` now pins the `static-server` base at `0.1.9@sha256:af6cc284…edc72` (merged Dependabot docker PR); this repo was not re-released or redeployed for it, so the deployed image is still built on the 0.1.8 base (the stock default CSP added in 0.1.9 is replaced by this repo's own `CONTENT_SECURITY_POLICY`).
  - Dependabot policy encoded in .github/dependabot.yml (majors declined); open PRs merged 2026-10-19
