<script setup lang="ts">
defineProps<{
  total: number;
  great: number;
  avgPrice: number | null;
}>();
</script>

<template>
  <div class="stats">
    <div class="stat">
      <div class="n">{{ total }}</div>
      <div class="l">Ofertas encontradas</div>
    </div>
    <div class="stat">
      <div class="n">{{ great }}</div>
      <div class="l">Ofertazas ⚡</div>
    </div>
    <div class="stat">
      <div class="n">{{ avgPrice !== null ? `$${avgPrice}` : "-" }}</div>
      <div class="l">Precio promedio</div>
    </div>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  gap: 16px;
  padding: 14px 20px;
  flex-wrap: wrap;
}
.stat {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 16px;
  min-width: 110px;
}
.n {
  font-size: 20px;
  font-weight: 700;
}
.l {
  font-size: 12px;
  color: var(--muted);
}
</style>
