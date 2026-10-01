<script setup lang="ts">
// Core DAO tool UI — tab-based console with desktop-application aesthetics.
// Rendered standalone by App.vue and embedded in the dashboard at the default route.
// All chain reads are read-only; no wallet connection is required to view data.
//
// qt.css is imported here (not just in main.ts) so the styles are included when
// DaoView is consumed as a library by the dashboard or any other host.
import './styles/qt.css'
import { ref, computed } from 'vue'
import { AppTabNav, UiStatusBar, UiTabPanel, UiToolbar, type AppTab } from '@meddleware/ui'
import OverviewTab from './tabs/OverviewTab.vue'
import TreasuryTab from './tabs/TreasuryTab.vue'
import ProposalsTab from './tabs/ProposalsTab.vue'
import GovernanceTab from './tabs/GovernanceTab.vue'
import HistoryTab from './tabs/HistoryTab.vue'
import { useDaoEvents } from './composables/useDaoEvents.js'
import { useEpoch } from './composables/useEpoch.js'
import { network } from './config.js'

const TABS: AppTab[] = [
  { id: 'overview',    label: 'Overview' },
  { id: 'treasury',    label: 'Treasury' },
  { id: 'proposals',   label: 'Proposals' },
  { id: 'governance',  label: 'Governance' },
  { id: 'history',     label: 'History' },
]

const activeTab = ref('overview')

const TAB_COMPONENTS = {
  overview:   OverviewTab,
  treasury:   TreasuryTab,
  proposals:  ProposalsTab,
  governance: GovernanceTab,
  history:    HistoryTab,
}

const activeComponent = computed(() => TAB_COMPONENTS[activeTab.value as keyof typeof TAB_COMPONENTS])

const { lastRefresh, error: eventsError } = useDaoEvents(1)
const { epoch } = useEpoch()
</script>

<template>
  <div class="dao-view">
    <UiToolbar :actions="[{ id: 'home', label: '🏛 Meddleware DAO' }]" @action="activeTab = 'overview'" />

    <AppTabNav v-model="activeTab" :tabs="TABS" id-prefix="dao" variant="raised" aria-label="DAO sections" />

    <UiTabPanel id-prefix="dao" :tab="activeTab" class="dao-content">
      <component :is="activeComponent" />
    </UiTabPanel>

    <UiStatusBar :network="network" :healthy="!eventsError" :epoch="epoch" :last-refresh="lastRefresh" />
  </div>
</template>
