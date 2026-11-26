<script setup lang="ts">
// The DAO console: a tab-based view over the platform's on-chain state with a desktop-application look (overview, treasury, proposals, governance, history).
// Rendered standalone by App.vue and exported from src/index.ts for the dashboard to embed. Every chain read is read-only and no wallet connection is needed to view data.
// Related: src/tabs/ (the five tabs), src/composables/ (the reads), src/styles/qt.css (the console's utility classes).
// The console's utility classes, imported here so a host that embeds the view gets them too.
import './styles/qt.css'
// Vue's reactivity.
import { ref, computed } from 'vue'
// The tab list, panel, toolbar and status bar from the shared UI.
import { AppTabNav, UiStatusBar, UiTabPanel, UiToolbar, type AppTab } from '@meddleware/ui'
// The five tabs.
import OverviewTab from './tabs/OverviewTab.vue'
import TreasuryTab from './tabs/TreasuryTab.vue'
import ProposalsTab from './tabs/ProposalsTab.vue'
import GovernanceTab from './tabs/GovernanceTab.vue'
import HistoryTab from './tabs/HistoryTab.vue'
// The event feed (the status bar's last-refresh time and health come from it).
import { useDaoEvents } from './composables/useDaoEvents.js'
// The current epoch, for the status bar.
import { useEpoch } from './composables/useEpoch.js'
// The active network.
import { network } from './config.js'

// The tabs, in the order shown.
const TABS: AppTab[] = [
  { id: 'overview',    label: 'Overview' },
  { id: 'treasury',    label: 'Treasury' },
  { id: 'proposals',   label: 'Proposals' },
  { id: 'governance',  label: 'Governance' },
  { id: 'history',     label: 'History' },
]

// The open tab.
const activeTab = ref('overview')

// Each tab's component, by id.
const TAB_COMPONENTS = {
  overview:   OverviewTab,
  treasury:   TreasuryTab,
  proposals:  ProposalsTab,
  governance: GovernanceTab,
  history:    HistoryTab,
}

// The component for the open tab.
const activeComponent = computed(() => TAB_COMPONENTS[activeTab.value as keyof typeof TAB_COMPONENTS])

// The status bar's health and last-refresh time come from a one-event feed.
const { lastRefresh, error: eventsError } = useDaoEvents(1)
// The epoch, or null until known.
const { epoch } = useEpoch()
</script>

<template>
  <!-- The console: toolbar, tabs, the open tab's panel and the status bar in a column. -->
  <div class="dao-view">
    <!-- The toolbar's one action returns to the overview. -->
    <UiToolbar :actions="[{ id: 'home', label: '🏛 Meddleware DAO' }]" @action="activeTab = 'overview'" />

    <!-- The five tabs; the id prefix ties each tab to its panel. -->
    <AppTabNav v-model="activeTab" :tabs="TABS" id-prefix="dao" variant="raised" aria-label="DAO sections" />

    <!-- The panel of the open tab. -->
    <UiTabPanel id-prefix="dao" :tab="activeTab" class="dao-content">
      <!-- The open tab's component. -->
      <component :is="activeComponent" />
    </UiTabPanel>

    <!-- The network, health, epoch and last refresh, always visible. -->
    <UiStatusBar :network="network" :healthy="!eventsError" :epoch="epoch" :last-refresh="lastRefresh" />
  </div>
</template>
