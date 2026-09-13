<script setup lang="ts">
export interface Tab {
  id: string
  label: string
}

defineProps<{
  tabs: Tab[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
}>()
</script>

<template>
  <nav class="dao-tabs" aria-label="DAO sections">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="dao-tab"
      :class="{ 'dao-tab--active': modelValue === tab.id }"
      :aria-current="modelValue === tab.id ? 'page' : undefined"
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>
