<script setup lang="ts">
// Core DAO tool UI — tab-based console with desktop-application aesthetics.
// Rendered standalone by App.vue and embedded in the dashboard at the default route.
// All chain reads are read-only; no wallet connection is required to view data.
//
// qt.css is imported here (not just in main.ts) so the styles are included when
// DaoView is consumed as a library by the dashboard or any other host.
import './styles/qt.css'
import { ref, shallowRef, computed } from 'vue'
import TabBar from './components/TabBar.vue'
import StatusBar from './components/StatusBar.vue'
import OverviewTab from './tabs/OverviewTab.vue'
import TreasuryTab from './tabs/TreasuryTab.vue'
import ProposalsTab from './tabs/ProposalsTab.vue'
import GovernanceTab from './tabs/GovernanceTab.vue'
import HistoryTab from './tabs/HistoryTab.vue'
import { useDaoEvents } from './composables/useDaoEvents.js'
import { useEpoch } from './composables/useEpoch.js'

import type { Tab } from './components/TabBar.vue'

const TABS: Tab[] = [
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
    <div class="dao-toolbar">
      <button class="dao-toolbar__btn" @click="activeTab = 'overview'">🏛 Meddleware DAO</button>
      <span class="dao-toolbar__sep" />
      <span class="dao-muted" style="font-size: 0.75rem; padding: 0 4px">
        access_gate · testnet
      </span>
    </div>

    <TabBar :tabs="TABS" v-model="activeTab" />

    <div class="dao-content">
      <component :is="activeComponent" />
    </div>

    <StatusBar
      :epoch="epoch"
      :last-refresh="lastRefresh"
      :error="!!eventsError"
    />
  </div>
</template>
