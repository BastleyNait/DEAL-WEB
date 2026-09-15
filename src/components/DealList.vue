<script setup lang="ts">
import type { Deal, DealLayout } from "../domain/types";
import DealRow from "./DealRow.vue";
import DealCard from "./DealCard.vue";

defineProps<{
  deals: Deal[];
  budget: number;
  now: number;
  layout: DealLayout;
  columns: number;
  isSeen: (itemId: string) => boolean;
  isPublished: (itemId: string) => boolean;
  emptyHint: string;
}>();

const emit = defineEmits<{ open: [Deal]; toggleSeen: [string] }>();
</script>

<template>
  <div v-if="deals.length === 0" class="empty">
    <p class="empty-title">Nada que mostrar acá</p>
    <p class="empty-hint">{{ emptyHint }}</p>
  </div>

  <ol
    v-else
    :class="layout === 'grid' ? 'grid' : 'list'"
    :style="layout === 'grid' ? { '--cols': columns } : undefined"
  >
    <li v-for="deal in deals" :key="deal.itemId">
      <DealCard
        v-if="layout === 'grid'"
        :deal="deal"
        :budget="budget"
        :now="now"
        :seen="isSeen(deal.itemId)"
        :published="isPublished(deal.itemId)"
        @open="emit('open', $event)"
        @toggle-seen="emit('toggleSeen', $event)"
      />
      <DealRow
        v-else
        :deal="deal"
        :budget="budget"
        :now="now"
        :seen="isSeen(deal.itemId)"
        :published="isPublished(deal.itemId)"
        @open="emit('open', $event)"
        @toggle-seen="emit('toggleSeen', $event)"
      />
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

/* Cantidad de columnas controlada desde el slider de la barra. */
.grid {
  display: grid;
  grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr));
  gap: 14px;
}
.grid li {
  display: flex;
}

/* En pantallas angostas el número elegido no entra: se acomoda solo. */
@media (max-width: 860px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  }
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
