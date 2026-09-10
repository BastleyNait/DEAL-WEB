<script setup lang="ts">
defineProps<{
  counts: { all: number; great: number; review: number; auction: number; cheapest: number | null };
  lastUpdated: Date | null;
  loading: boolean;
}>();

const emit = defineEmits<{ refresh: []; toggleTheme: [] }>();
</script>

<template>
  <header class="desk">
    <div class="identity">
      <h1>Mesa de compra</h1>
      <p class="sub">
        Laptops en eBay US bajo $200 · i7 10-12va, i5 11-12va, Ryzen 5/7 · llegada al casillero de Doral, FL
      </p>
    </div>

    <!-- Cifras en línea, no en tarjetones: el dato importante son las ofertas,
         no los totales. -->
    <dl class="readout">
      <div>
        <dt class="label">en lista</dt>
        <dd class="mono">{{ counts.all }}</dd>
      </div>
      <div>
        <dt class="label">ofertazas</dt>
        <dd class="mono good">{{ counts.great }}</dd>
      </div>
      <div>
        <dt class="label">a revisar</dt>
        <dd class="mono warn">{{ counts.review }}</dd>
      </div>
      <div>
        <dt class="label">subastas</dt>
        <dd class="mono">{{ counts.auction }}</dd>
      </div>
      <div>
        <dt class="label">más barata</dt>
        <dd class="mono">{{ counts.cheapest !== null ? `$${Math.round(counts.cheapest)}` : "—" }}</dd>
      </div>
    </dl>

    <div class="actions">
      <span class="stamp label">
        {{ loading ? "buscando…" : lastUpdated ? `últ. lectura ${lastUpdated.toLocaleTimeString()}` : "sin leer" }}
      </span>
      <button type="button" class="ghost" @click="emit('refresh')">Actualizar</button>
      <button type="button" class="ghost icon" title="Cambiar tema" @click="emit('toggleTheme')">◐</button>
    </div>
  </header>
</template>

<style scoped>
.desk {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px 28px;
  padding: 20px 24px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--rule);
}

.identity h1 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.sub {
  margin: 3px 0 0;
  max-width: 62ch;
  font-size: 12.5px;
  color: var(--ink-2);
}

.readout {
  grid-column: 1 / 2;
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  margin: 2px 0 0;
}
.readout div {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.readout dd {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.1;
}
.readout .good {
  color: var(--good);
}
.readout .warn {
  color: var(--warn);
}

.actions {
  grid-row: 1 / 3;
  grid-column: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: start;
}
.stamp {
  color: var(--ink-3);
}
.ghost {
  font: inherit;
  font-size: 12.5px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--rule-strong);
  border-radius: 6px;
  padding: 5px 11px;
  cursor: pointer;
}
.ghost:hover {
  border-color: var(--link);
  color: var(--link);
}
.icon {
  padding: 5px 9px;
}

@media (max-width: 720px) {
  .desk {
    grid-template-columns: 1fr;
  }
  .actions {
    grid-row: auto;
    grid-column: 1;
  }
}
</style>
