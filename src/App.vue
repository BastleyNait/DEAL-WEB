<script setup lang="ts">
import { SupabaseDealsRepository } from "./infrastructure/SupabaseDealsRepository";
import { useDeals } from "./composables/useDeals";
import StatsBar from "./components/StatsBar.vue";
import FilterBar from "./components/FilterBar.vue";
import DealGrid from "./components/DealGrid.vue";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const misconfigured = !supabaseUrl || !anonKey;

// Composition root del frontend: acá (y solo acá) se elige la implementación
// concreta del repositorio. El resto de la app solo conoce DealsRepository.
const repository = new SupabaseDealsRepository(supabaseUrl, anonKey);
const { loading, error, lastUpdated, onlyGreatDeals, onlyNeedsReview, sortBy, visibleDeals, stats, reload } = useDeals(repository);
</script>

<template>
  <header>
    <h1>🎯 Deal Hunter — Revolt Laptops</h1>
    <p>Laptops i7 10/11va, i5 11/12va, Ryzen 5 5000, Ryzen 7 4000 — bajo $200 y sin fallas de batería/almacenamiento.</p>
  </header>

  <div v-if="misconfigured" id="error" style="display: block">
    Faltan <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>. Copiá
    <code>.env.example</code> a <code>.env</code> y completá los valores de tu proyecto de Supabase.
  </div>

  <template v-else>
    <StatsBar :total="stats.total" :great="stats.great" :avg-price="stats.avgPrice" />
    <FilterBar
      v-model:only-great="onlyGreatDeals"
      v-model:only-needs-review="onlyNeedsReview"
      v-model:sort-by="sortBy"
      :last-updated="lastUpdated"
      @refresh="reload"
    />

    <div v-if="error" id="error" style="display: block">
      No se pudo conectar a Supabase: {{ error }}
    </div>
    <div v-else-if="loading" id="empty">Cargando ofertas...</div>
    <DealGrid v-else :deals="visibleDeals" />
  </template>
</template>

<style scoped>
header {
  padding: 24px 20px 12px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--bg);
  z-index: 5;
}
header h1 {
  margin: 0 0 4px;
  font-size: 22px;
}
header p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}
#error {
  padding: 20px;
  color: #ff6b6b;
}
#empty {
  padding: 40px 20px;
  color: var(--muted);
  text-align: center;
}
</style>
