<script setup lang="ts">
import type { Deal, DealLayout } from "../domain/types";
import DealRow from "./DealRow.vue";
import DealCard from "./DealCard.vue";

defineProps<{ deals: Deal[]; budget: number; now: number; layout: DealLayout; emptyHint: string }>();
</script>

<template>
  <div v-if="deals.length === 0" class="empty">
    <p class="empty-title">Nada que mostrar acá</p>
    <p class="empty-hint">{{ emptyHint }}</p>
  </div>

  <ol v-else :class="layout === 'grid' ? 'grid' : 'list'">
    <li v-for="deal in deals" :key="deal.itemId">
      <DealCard v-if="layout === 'grid'" :deal="deal" :budget="budget" :now="now" />
      <DealRow v-else :deal="deal" :budget="budget" :now="now" />
    </li>
  </ol>
</template>

<style scoped>
.list,
.grid {
  list-style: none;
  margin: 0;
  padding: 16px 24px 48px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Grilla variable: las columnas se acomodan al ancho disponible en vez de
   quedar fijas, así entra más por fila en pantallas anchas. */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}
.grid li {
  display: flex;
}
.grid li > * {
  width: 100%;
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
