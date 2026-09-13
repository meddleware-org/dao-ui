<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <div class="dao-panel">
    <div v-if="title" class="dao-panel__head">{{ title }}</div>
    <div class="dao-panel__body">
      <slot />
    </div>
  </div>
</template>
