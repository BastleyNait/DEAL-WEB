<script setup lang="ts">
import type { DealSortBy, DealView } from "../domain/types";

const view = defineModel<DealView>("view", { required: true });
const sortBy = defineModel<DealSortBy>("sortBy", { required: true });
const query = defineModel<string>("query", { required: true });

defineProps<{
  counts: { all: number; great: number; review: number };
  shown: number;
}>();

const VIEWS: { id: DealView; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "great", label: "Ofertazas" },
  { id: "review", label: "A revisar" },
];
</script>

<template>
  <div class="toolbar">
    <div class="segmented" role="tablist">
      <button
        v-for="option in VIEWS"
        :key="option.id"
        type="button"
        role="tab"
        :aria-selected="view === option.id"
        :class="{ active: view === option.id }"
        @click="view = option.id"
      >
        {{ option.label }}
        <span class="count mono">{{ counts[option.id] }}</span>
      </button>
    </div>

    <input v-model="query" type="search" class="search" placeholder="Filtrar por modelo o CPU…" />

    <label class="sort">
      <span class="label">orden</span>
      <select v-model="sortBy">
        <option value="score">Puntaje</option>
        <option value="price">Precio</option>
        <option value="ending">Cierre de subasta</option>
        <option value="date">Novedad</option>
      </select>
    </label>

    <span class="shown label">{{ shown }} en pantalla</span>
  </div>
</template>

<style scoped>
.toolbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
}

.segmented {
  display: flex;
  background: var(--surface-sunk);
  border-radius: 7px;
  padding: 2px;
}
.segmented button {
  display: flex;
  align-items: center;
  gap: 6px;
  font: inherit;
  font-size: 12.5px;
  color: var(--ink-2);
  background: transparent;
  border: 0;
  border-radius: 5px;
  padding: 5px 11px;
  cursor: pointer;
}
.segmented button.active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-row);
}
.count {
  font-size: 11px;
  color: var(--ink-3);
}
.segmented button.active .count {
  color: var(--link);
}

.search {
  flex: 1;
  min-width: 180px;
  max-width: 320px;
  font: inherit;
  font-size: 13px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--rule-strong);
  border-radius: 6px;
  padding: 6px 10px;
}
.search::placeholder {
  color: var(--ink-3);
}

.sort {
  display: flex;
  align-items: center;
  gap: 6px;
}
select {
  font: inherit;
  font-size: 12.5px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--rule-strong);
  border-radius: 6px;
  padding: 5px 8px;
}

.shown {
  margin-left: auto;
  color: var(--ink-3);
}
</style>
