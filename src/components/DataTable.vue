<script setup lang="ts">
// Scrollable table shell with a `head` slot (header cells) and default slot (rows).
// Renders the `empty` message when no rows are provided.
defineProps<{ empty?: string }>()

const slots = defineSlots<{
  head(): unknown
  default(): unknown
}>()
</script>

<template>
  <div style="overflow-x: auto">
    <table class="dao-table">
      <thead>
        <tr>
          <slot name="head" />
        </tr>
      </thead>
      <tbody>
        <slot />
      </tbody>
    </table>
    <p v-if="empty && !slots.default" class="dao-placeholder">{{ empty }}</p>
  </div>
</template>
