<script setup lang="ts">
// Thin wrapper over AppTabNav variant="raised" from @meddleware/ui.
// Keeps dao-ui's internal import path stable while using the shared component.
import { AppTabNav } from '@meddleware/ui'
export type { AppTab as Tab } from '@meddleware/ui'

defineProps<{ tabs: { id: string; label: string }[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
</script>

<template>
  <AppTabNav
    :tabs="tabs"
    :model-value="modelValue"
    variant="raised"
    aria-label="DAO sections"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
