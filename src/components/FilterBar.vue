<script setup lang="ts">
import type { DealSortBy } from "../domain/types";

const onlyGreat = defineModel<boolean>("onlyGreat", { required: true });
const sortBy = defineModel<DealSortBy>("sortBy", { required: true });

defineProps<{
  lastUpdated: Date | null;
}>();

const emit = defineEmits<{ refresh: [] }>();
</script>

<template>
  <div class="controls">
    <label>
      <input type="checkbox" v-model="onlyGreat" />
      Solo ofertazas (⚡ &lt;$160 o puntaje alto)
    </label>
    <label>
      Ordenar por
      <select v-model="sortBy">
        <option value="score">Puntaje</option>
        <option value="price">Precio (menor primero)</option>
        <option value="date">Más recientes</option>
      </select>
    </label>
    <button type="button" @click="emit('refresh')">↻ Actualizar</button>
    <span v-if="lastUpdated" class="updated">actualizado {{ lastUpdated.toLocaleTimeString() }}</span>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 0 20px 16px;
  flex-wrap: wrap;
  font-size: 13px;
}
label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
}
select {
  background: var(--panel-2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
}
input[type="checkbox"] {
  accent-color: var(--accent);
}
button {
  background: var(--panel-2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
button:hover {
  border-color: var(--accent);
}
.updated {
  color: var(--muted);
}
</style>
