// CI dependency gate: `npm audit` at high/critical, minus advisories listed in
// .github/audit-allowlist.json. Each entry needs a reason and an expiry date, so an
// accepted advisory is re-reviewed instead of being ignored forever.
// `execFileSync` runs `npm audit` without a shell.
import { execFileSync } from 'node:child_process'
// Read the allow-list, if there is one.
import { existsSync, readFileSync } from 'node:fs'

// The allow-list: advisories accepted for a stated reason until a stated date.
const ALLOWLIST = '.github/audit-allowlist.json'
// Only these severities fail the gate.
const LEVELS = new Set(['high', 'critical'])
// The shape of a GitHub advisory id: `GHSA-` and three groups of four characters from its alphabet.
const GHSA = /^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/
// An expiry is a plain `YYYY-MM-DD` date.
const DATE = /^\d{4}-\d{2}-\d{2}$/

// Set when any check fails; the exit status reads it at the end.
let failed = false
// Report a failure as a GitHub Actions error annotation and remember it.
const fail = (msg) => {
  console.log(`::error::${msg}`)
  failed = true
}

// The allow-list's entries (none when the file does not exist).
const entries = existsSync(ALLOWLIST) ? JSON.parse(readFileSync(ALLOWLIST, 'utf8')) : []
// A malformed file stops the gate rather than being read as empty.
if (!Array.isArray(entries)) throw new Error(`${ALLOWLIST} must be an array`)
// Today as `YYYY-MM-DD`, comparable with an expiry as text.
const today = new Date().toISOString().slice(0, 10)
// The valid, unexpired entries by advisory id.
const allowed = new Map()
// Check each entry: it needs an id, a reason and an expiry; an expired one fails so it is reviewed again.
for (const e of entries) {
  if (!GHSA.test(e?.id) || typeof e.reason !== 'string' || !e.reason || !DATE.test(e.expires)) {
    fail(`invalid allowlist entry ${JSON.stringify(e)} (needs id, reason, expires YYYY-MM-DD)`)
  } else if (e.expires < today) {
    fail(`allowlist entry ${e.id} expired on ${e.expires}; re-review it`)
  } else {
    allowed.set(e.id, e)
  }
}

// The JSON `npm audit` prints.
let raw
try {
  // Run the audit; the output is JSON.
  raw = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 << 20 })
} catch (err) {
  // npm audit exits non-zero whenever it reports anything; the JSON is still on stdout.
  // `npm audit` exits non-zero whenever it reports anything, so the JSON is taken from the error.
  raw = err.stdout
}
// The parsed report; an `error` field means the audit itself failed, which must not pass quietly.
const report = JSON.parse(raw)
if (report.error) throw new Error(`npm audit failed: ${JSON.stringify(report.error)}`)

// The high and critical advisories found, by id.
const found = new Map()
// Walk each vulnerable package's advisories; a string in `via` is a dependency path, not an advisory.
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via === 'object' && LEVELS.has(via.severity)) {
      found.set(via.url.split('/').pop(), via)
    }
  }
}

// Each advisory is either allowed (a warning with its reason) or a failure.
for (const [id, via] of found) {
  const entry = allowed.get(id)
  if (entry) {
    console.log(`::warning::${id} (${via.name}, ${via.severity}) allowed until ${entry.expires}: ${entry.reason}`)
  } else {
    fail(`${id} (${via.name}, ${via.severity}): ${via.title}`)
  }
}
// An allow-list entry that no longer matches anything should be removed.
for (const id of allowed.keys()) {
  if (!found.has(id)) console.log(`::warning::allowlist entry ${id} no longer matches an advisory; remove it`)
}

// How many advisories are not allow-listed.
const open = [...found.keys()].filter((id) => !allowed.has(id)).length
console.log(`${found.size} high/critical advisories, ${open} not allowlisted`)
// The exit status is the gate's result.
process.exit(failed ? 1 : 0)
