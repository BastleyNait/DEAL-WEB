<script setup lang="ts">
import { computed } from "vue";
import { SupabaseDealsRepository } from "./infrastructure/SupabaseDealsRepository";
import { useDeals } from "./composables/useDeals";
import { useClock } from "./composables/useClock";
import { useTheme } from "./composables/useTheme";
import { useLayout } from "./composables/useLayout";
import DeskHeader from "./components/DeskHeader.vue";
import Toolbar from "./components/Toolbar.vue";
import DealList from "./components/DealList.vue";

// Tope de presupuesto del backend (search_config.maxPriceUsd): cada precio se
// muestra en relación a este límite, que es la regla real de compra.
const BUDGET_USD = 200;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const misconfigured = !supabaseUrl || !anonKey;

// Composition root del frontend: acá (y solo acá) se elige la implementación
// concreta del repositorio. El resto de la app solo conoce DealsRepository.
const repository = new SupabaseDealsRepository(supabaseUrl, anonKey);
const { loading, error, lastUpdated, view, format, sortBy, query, visibleDeals, counts, reload } = useDeals(repository);
const now = useClock();
const { toggle: toggleTheme } = useTheme();
const { layout } = useLayout();

const emptyHint = computed(() => {
  if (query.value.trim()) return `Ningún equipo coincide con “${query.value.trim()}”.`;
  if (view.value === "great") return "Todavía no apareció ninguna por debajo de $160 ni con puntaje alto.";
  if (view.value === "review") return "Ninguna oferta quedó con datos faltantes: todas traen descripción y batería.";
  return "El cazador todavía no guardó ofertas. Corré la función hunt-deals o esperá al próximo barrido.";
});
</script>

<template>
  <div v-if="misconfigured" class="notice">
    <h1>Falta conectar el backend</h1>
    <p>
      Copiá <code>.env.example</code> a <code>.env</code> y completá <code>VITE_SUPABASE_URL</code> y
      <code>VITE_SUPABASE_ANON_KEY</code> con los datos de tu proyecto de Supabase.
    </p>
  </div>

  <template v-else>
    <DeskHeader :counts="counts" :last-updated="lastUpdated" :loading="loading" @refresh="reload" @toggle-theme="toggleTheme" />

    <Toolbar
      v-model:view="view"
      v-model:format="format"
      v-model:layout="layout"
      v-model:sort-by="sortBy"
      v-model:query="query"
      :counts="counts"
      :shown="visibleDeals.length"
    />

    <main>
      <div v-if="error" class="notice error">
        <h2>No se pudo leer el backend</h2>
        <p>{{ error }}</p>
        <button type="button" @click="reload">Reintentar</button>
      </div>
      <p v-else-if="loading && visibleDeals.length === 0" class="loading label">leyendo ofertas…</p>
      <DealList
        v-else
        :deals="visibleDeals"
        :budget="BUDGET_USD"
        :now="now"
        :layout="layout"
        :empty-hint="emptyHint"
      />
    </main>
  </template>
</template>

<style scoped>
main {
  min-height: 40vh;
}

.notice {
  max-width: 60ch;
  margin: 56px auto;
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 10px;
}
.notice h1,
.notice h2 {
  margin: 0 0 8px;
  font-size: 17px;
  letter-spacing: -0.01em;
}
.notice p {
  margin: 0;
  color: var(--ink-2);
  font-size: 13.5px;
}
.notice.error {
  border-left: 3px solid var(--urgent);
}
.notice button {
  font: inherit;
  font-size: 13px;
  margin-top: 14px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--rule-strong);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
.notice button:hover {
  border-color: var(--link);
  color: var(--link);
}

code {
  font-family: "IBM Plex Mono", monospace;
  font-size: 12.5px;
  background: var(--surface-sunk);
  border-radius: 4px;
  padding: 1px 5px;
}

.loading {
  padding: 56px 24px;
  text-align: center;
}
</style>
