#!/usr/bin/env node
// Writes dist/THIRD_PARTY_LICENSES: the licence and NOTICE texts of every production dependency in
// package-lock.json. The site ships a bundle, so the packages' own files do not travel with it;
// Apache-2.0 (§4), MIT and BSD all require the notice to accompany a redistribution. The file is served
// with the site (/THIRD_PARTY_LICENSES) and read by licence audits.
//
//   node scripts/third-party-licenses.mjs            write the file
//   node scripts/third-party-licenses.mjs --check    also fail when the file would be empty
// File-system helpers.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
// Path helpers.
import { dirname, join } from 'node:path'
// The script's own location, from its module URL.
import { fileURLToPath } from 'node:url'

// The repository root: one level above this script.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// The lock file lists every installed package.
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
// With `--check` the script fails when the result would be empty.
const check = process.argv.includes('--check')
// File names that carry a licence or a notice.
const LICENSE_FILE = /^(licen[cs]e|notice|copying|unlicense)(\.|$|-)/i

// The text written to the output file, in pieces.
const out = []
// Packages that ship no licence file.
const missing = []
// The Apache-2.0 ones among them, which need the licence text appended.
const apacheMissing = []
// The licence a package declares, whatever form it uses.
const declared = (pkg) => (typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license ?? pkg.licenses ?? 'unknown'))
// Who holds the copyright, for a package that ships no licence file.
const holder = (pkg) =>
  [pkg.author && (typeof pkg.author === 'string' ? pkg.author : pkg.author.name), pkg.repository && (typeof pkg.repository === 'string' ? pkg.repository : pkg.repository.url)]
    .filter(Boolean)
    .join(' · ')
// The production packages: those under node_modules that are neither dev-only nor optional, sorted.
const names = Object.keys(lock.packages)
  .filter((p) => p.startsWith('node_modules/') && !lock.packages[p].dev && !lock.packages[p].optional)
  .sort()
// One section per package.
for (const p of names) {
  // The package's folder (skipped when it is not installed).
  const dir = join(root, p)
  if (!existsSync(dir)) continue
  // Its manifest, for the name, version and licence.
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  // Its licence and notice files.
  const files = readdirSync(dir).filter((f) => LICENSE_FILE.test(f)).sort()
  // A heading with the package, its version and its declared licence.
  out.push(`${'='.repeat(78)}\n${pkg.name}@${pkg.version}  (${declared(pkg)})\n${'='.repeat(78)}`)
  // No licence file: remember the package.
  if (files.length === 0) {
    missing.push(`${pkg.name}@${pkg.version}`)
    if (/Apache-2\.0/.test(declared(pkg))) apacheMissing.push(`${pkg.name}@${pkg.version}`)
  }
  // The text of each licence and notice file.
  for (const f of files) out.push(`--- ${f} ---\n${readFileSync(join(dir, f), 'utf8').trim()}\n`)
  if (files.length === 0) {
    const apache = /Apache-2\.0/.test(declared(pkg))
    out.push(`(the package ships no licence file; declared licence: ${declared(pkg)}${holder(pkg) ? `; ${holder(pkg)}` : ''}${apache ? '; the Apache License 2.0 text follows at the end of this file' : ''})\n`)
  }
}
// Apache-2.0 §4(a) asks that a recipient gets a copy of the License. A package that declares it but ships no
// file is covered by the canonical text, taken from any installed package that carries it.
// Apache-2.0 §4(a) asks that a recipient gets a copy of the licence; the canonical text is taken from any installed package that carries it.
if (apacheMissing.length > 0) {
  let text = null
  for (const p of Object.keys(lock.packages).filter((k) => k.startsWith('node_modules/'))) {
    const dir = join(root, p)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir).filter((x) => LICENSE_FILE.test(x))) {
      const t = readFileSync(join(dir, f), 'utf8')
      if (/Apache License\s+Version 2\.0, January 2004/.test(t) && /END OF TERMS AND CONDITIONS/.test(t)) {
        text = t.slice(0, t.indexOf('END OF TERMS AND CONDITIONS') + 'END OF TERMS AND CONDITIONS'.length).trim()
        break
      }
    }
    if (text) break
  }
  out.push(`${'='.repeat(78)}\nApache License 2.0 — applies to: ${apacheMissing.join(', ')}\n${'='.repeat(78)}`)
  out.push(text ?? '(canonical text not found in the installed packages: see https://www.apache.org/licenses/LICENSE-2.0)')
  if (check && text === null) {
    console.error('Apache-2.0 packages without a licence file, and no canonical Apache License text installed')
    process.exit(1)
  }
}
// Make sure the output folder exists.
mkdirSync(join(root, 'dist'), { recursive: true })
// Write the file; the site serves it as /THIRD_PARTY_LICENSES.
writeFileSync(join(root, 'dist', 'THIRD_PARTY_LICENSES'), `${out.join('\n')}\n`)
// Say how many packages and how many lacked a licence file.
console.log(`THIRD_PARTY_LICENSES: ${names.length} production packages, ${missing.length} without a licence file`)
if (missing.length) console.log(`  no licence file: ${missing.join(', ')}`)
// `--check` fails when no production package was found.
if (check && out.length === 0) {
  console.error('no production packages found in package-lock.json')
  process.exit(1)
}
