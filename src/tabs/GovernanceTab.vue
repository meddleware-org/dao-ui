<script setup lang="ts">
import { computed } from 'vue'
import Panel from '../components/Panel.vue'
import { usePlatformConfig } from '../composables/usePlatformConfig.js'

const { config } = usePlatformConfig()

const commissionPct = computed(() =>
  config.value ? (config.value.commissionBps / 100).toFixed(2) + '%' : '—',
)
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 10px">
    <Panel title="On-Chain Parameters (access_gate)">
      <div class="dao-stat-grid" style="max-width: 420px">
        <span class="dao-stat-grid__label">Commission rate</span>
        <span class="dao-stat-grid__value dao-mono">{{ commissionPct }}</span>

        <span class="dao-stat-grid__label">Max commission cap</span>
        <span class="dao-stat-grid__value dao-mono">10.00% (1000 bps — on-chain hard cap)</span>

        <span class="dao-stat-grid__label">Treasury address</span>
        <span
          class="dao-stat-grid__value dao-mono"
          style="font-size: 0.72rem; text-align: left; word-break: break-all"
        >
          {{ config?.treasury ?? '—' }}
        </span>
      </div>

      <p class="dao-muted" style="margin: 10px 0 0; font-size: 0.72rem">
        Parameters are governed by <code>PlatformAdminCap</code> on-chain.
        Commission is split on every NFT purchase: <code>commission_bps / 10000 × price</code>
        routes to treasury; the remainder goes to the gate operator.
      </p>
    </Panel>

    <Panel title="Vault DAO Parameters">
      <p class="dao-muted" style="margin: 0; font-size: 0.78rem">
        DAO-governed vault parameters (skim fee, buyback ratio, allocation caps, fee recipients)
        will appear here when <code>vault_config</code> and <code>vault_dao</code> are deployed.
      </p>
    </Panel>

    <Panel title="Admin Actions">
      <p class="dao-muted" style="margin: 0; font-size: 0.78rem">
        Privileged actions (update commission, change treasury, pause gates) require the
        <code>PlatformAdminCap</code> or <code>DaoAdminCap</code>.
        Connect a wallet holding the relevant capability to enable these controls.
      </p>
    </Panel>
  </div>
</template>
