# Changelog

All notable changes to `@meddleware/dao-ui` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/). Before 0.2.0, breaking changes ship as patch releases.
Releases before 0.1.34 are recorded in the git history only.

## [0.1.38] - 2026-10-30

- Point the developer-docs and indexer links at the machine zone (ADR-0005); current @meddleware packages.

## [0.1.37] - 2026-10-24

### Changed

- Machine-zone endpoints (the indexer and the Walrus relays) can be overridden at deploy time by a same-origin `/runtime-config.json` (`@meddleware/ui` 0.1.34 `loadRuntimeConfig`), so the image is built once and moved between Cloudflare zones by configuration (workspace ADR-0005). Without the file the build-time values apply, as before.

## [0.1.36] - 2026-10-22

### Changed

- Image base: static-server 0.1.11 (Go 1.26.10 standard library, CVE-2026-111943, so the scan-before-sign gate passes)

## [0.1.35] - 2026-10-22

### Changed

- @meddleware/access-gate-client ^0.0.10: a stale indexer head page (polledAt older than 60 s) now falls back to the node

## [0.1.34] - 2026-10-18

### Added

- `LICENSE` (0BSD, as the package declares; audit F13).
- `tests/design-tokens-used.test.ts`: no component or stylesheet draws `--warning` as a text colour, and every
  custom property the app reads is defined by design-tokens (audit F12, F20).
- `tests/governance-tab.test.ts`: the Governance tab states the contract's commission rule, shows the live
  minimum commission, and names only `PlatformAdminCap` (audit F14).

### Changed

- Governance tab: the commission footnote now reads `max(price x commission_bps / 10000, minimum commission)`,
  never more than 10% of the price (as `access_gate` pays it), a *Minimum commission* row shows
  `min_commission_mist` from `PlatformConfig`, and the "no cap" message names `PlatformAdminCap` only (the one
  capability the check tests). `usePlatformConfig` also returns `minCommissionMist` (audit F14). README and
  CLAUDE.md describe the same rule.
- Dependencies: `@meddleware/access-gate-client` ^0.0.9, `@meddleware/design-tokens` ^0.1.10.
- Image base: static-server 0.1.8 (`sha256:e32cf42b...4000`).
- `npm-publish.yml` `verify` calls `node-ci.yml`, so the package is released only if the full CI set passes
  (type-check, linters, tests, build, licences), as the image release does (audit F11, F16).

### Fixed

- `App.vue` read the undefined `--font-mono`; it now uses `--mw-font-mono` (audit F20).

### Removed

- The unused `.dao-notice` rule in `qt.css`, which drew `--warning` as text (audit F12).
