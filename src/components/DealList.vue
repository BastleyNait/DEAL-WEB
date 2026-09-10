<script setup lang="ts">
import type { Deal } from "../domain/types";
import DealRow from "./DealRow.vue";

defineProps<{ deals: Deal[]; budget: number; now: number; emptyHint: string }>();
</script>

<template>
  <div v-if="deals.length === 0" class="empty">
    <p class="empty-title">Nada que mostrar acá</p>
    <p class="empty-hint">{{ emptyHint }}</p>
  </div>
  <ol v-else class="list">
    <li v-for="deal in deals" :key="deal.itemId">
      <DealRow :deal="deal" :budget="budget" :now="now" />
    </li>
  </ol>
</template>

<style scoped>
.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 16px 24px 48px;
}

.empty {
  padding: 64px 24px;
  text-align: center;
}
.empty-title {
  margin: 0 0 4px;
  font-weight: 600;
}
.empty-hint {
  margin: 0;
  font-size: 13px;
  color: var(--ink-2);
}
</style>
