<script setup lang="ts">
import type { DealFormat, DealLayout, DealSortBy, DealView } from "../domain/types";
import { MAX_COLUMNS, MIN_COLUMNS } from "../composables/useLayout";

const view = defineModel<DealView>("view", { required: true });
const format = defineModel<DealFormat>("format", { required: true });
const layout = defineModel<DealLayout>("layout", { required: true });
const columns = defineModel<number>("columns", { required: true });
const sortBy = defineModel<DealSortBy>("sortBy", { required: true });
const query = defineModel<string>("query", { required: true });

defineProps<{
  counts: {
    unseen: number;
    all: number;
    special: number;
    great: number;
    review: number;
    buyNow: number;
    auction: number;
  };
  shown: number;
}>();

const VIEWS: { id: DealView; label: string }[] = [
  { id: "unseen", label: "Sin ver" },
  { id: "all", label: "Todas" },
  { id: "special", label: "🔄 2 en 1" },
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

    <!-- Dos formatos, no cuatro: o el precio es el que ves (fijo y "acepta
         oferta", donde la oferta solo puede bajarlo) o es una puja que puede
         subir. Arranca en compra directa. -->
    <div class="segmented formats" role="group" aria-label="Formato de compra">
      <button
        type="button"
        :aria-pressed="format === 'buyNow'"
        :class="{ active: format === 'buyNow' }"
        @click="format = 'buyNow'"
      >
        Compra directa
        <span class="count mono">{{ counts.buyNow }}</span>
      </button>
      <button
        type="button"
        :aria-pressed="format === 'auction'"
        :class="{ active: format === 'auction' }"
        @click="format = 'auction'"
      >
        Subastas
        <span class="count mono">{{ counts.auction }}</span>
      </button>
    </div>

    <label class="sort">
      <span class="label">orden</span>
      <select v-model="sortBy">
        <option value="score">Puntaje</option>
        <option value="price">Precio</option>
        <option value="ending">Cierre de subasta</option>
        <option value="date">Novedad</option>
      </select>
    </label>

    <div class="right">
      <label v-if="layout === 'grid'" class="density">
      <span class="label">por fila</span>
      <input
        v-model.number="columns"
        type="range"
        :min="MIN_COLUMNS"
        :max="MAX_COLUMNS"
        step="1"
        aria-label="Tarjetas por fila"
      />
        <span class="density-value mono">{{ columns }}</span>
      </label>

      <div class="layout-switch" role="group" aria-label="Vista">
      <button
        type="button"
        :aria-pressed="layout === 'list'"
        :class="{ active: layout === 'list' }"
        title="Vista de lista"
        @click="layout = 'list'"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1" y="2.5" width="14" height="2.6" rx="1" fill="currentColor" />
          <rect x="1" y="6.7" width="14" height="2.6" rx="1" fill="currentColor" />
          <rect x="1" y="10.9" width="14" height="2.6" rx="1" fill="currentColor" />
        </svg>
        <span class="sr-only">Lista</span>
      </button>
      <button
        type="button"
        :aria-pressed="layout === 'grid'"
        :class="{ active: layout === 'grid' }"
        title="Vista de grilla"
        @click="layout = 'grid'"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1" y="1" width="6.2" height="6.2" rx="1.2" fill="currentColor" />
          <rect x="8.8" y="1" width="6.2" height="6.2" rx="1.2" fill="currentColor" />
          <rect x="1" y="8.8" width="6.2" height="6.2" rx="1.2" fill="currentColor" />
          <rect x="8.8" y="8.8" width="6.2" height="6.2" rx="1.2" fill="currentColor" />
        </svg>
          <span class="sr-only">Grilla</span>
        </button>
      </div>

      <span class="shown label">{{ shown }} en pantalla</span>
    </div>
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
/* Las subastas quedan en segundo plano: el formato activo se ve, pero el
   conmutador no compite con el selector de vistas. */
.formats button {
  color: var(--ink-3);
}
.formats button.active {
  color: var(--ink-2);
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

.right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.density {
  display: flex;
  align-items: center;
  gap: 7px;
}
.density input[type="range"] {
  width: 92px;
  accent-color: var(--link);
  cursor: pointer;
}
.density-value {
  font-size: 12px;
  color: var(--ink-2);
  min-width: 9px;
}

.layout-switch {
  display: flex;
  background: var(--surface-sunk);
  border-radius: 7px;
  padding: 2px;
}
.layout-switch button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 26px;
  color: var(--ink-3);
  background: transparent;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
}
.layout-switch button.active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-row);
}
.layout-switch button:hover:not(.active) {
  color: var(--ink-2);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.shown {
  color: var(--ink-3);
}
</style>
