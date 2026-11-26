<script setup lang="ts">
// One amount in SUI: formats a MIST bigint for people (a dash for null). Display only; never the source of truth for accounting.
// Related: the Overview and Treasury tabs use it; styles/qt.css draws `dao-amount`.
// The amount in MIST (null shows a dash), an optional symbol (SUI by default) and a muted look.
defineProps<{
  mist: bigint | null
  symbol?: string
  muted?: boolean
}>()

// Zero is written plainly; otherwise four decimals, or up to nine with trailing zeros trimmed for a small amount.
/** Format `mist` as `symbol` for display: zero plainly, otherwise four decimals (more for a tiny amount). */
function format(mist: bigint, symbol: string): string {
  // Zero needs no decimals.
  if (mist === 0n) return `0 ${symbol}`
  // MIST to SUI (one SUI is 10^9 MIST); a Number is enough for display.
  const n = Number(mist) / 1e9
  // Four decimals for ordinary amounts, more digits for tiny ones so they do not round to zero.
  const s = n >= 0.0001 ? n.toFixed(4) : n.toFixed(9).replace(/0+$/, '').replace(/\.$/, '')
  return `${s} ${symbol}`
}
</script>

<template>
  <!-- The amount in the mono face, right-aligned (qt.css). -->
  <span class="dao-amount" :class="{ 'dao-amount--muted': muted }">
    <!-- A known amount. -->
    <template v-if="mist !== null">{{ format(mist, symbol ?? 'SUI') }}</template>
    <!-- Not known yet: a dash. -->
    <template v-else>—</template>
  </span>
</template>
