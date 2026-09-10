<script setup lang="ts">
import type { Deal } from "../domain/types";
import DealCard from "./DealCard.vue";

defineProps<{ deals: Deal[] }>();
</script>

<template>
  <div v-if="deals.length === 0" id="empty">
    Todavía no hay ofertas guardadas. Corré la función <code>hunt-deals</code> del backend al menos una vez.
  </div>
  <div v-else class="grid">
    <DealCard v-for="deal in deals" :key="deal.itemId" :deal="deal" />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
  padding: 0 20px 40px;
}
#empty {
  padding: 40px 20px;
  color: var(--muted);
  text-align: center;
}
</style>
