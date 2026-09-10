<script setup lang="ts">
import { computed } from "vue";
import type { Deal } from "../domain/types";
import { reviewFlags } from "../domain/types";
import { brandInitials, ramLabel, screenLabel, storageLabel } from "../domain/listing-specs";

const props = defineProps<{ deal: Deal; budget: number; now: number }>();

const specs = computed(() =>
  [props.deal.cpuMatch, ramLabel(props.deal.title), storageLabel(props.deal.title), screenLabel(props.deal.title)].filter(
    (s): s is string => Boolean(s),
  ),
);

const flags = computed(() => reviewFlags(props.deal));

// Posición del precio sobre el tope de presupuesto: lo que importa no es el
// número suelto sino cuánto margen queda hasta el límite.
const budgetFill = computed(() => {
  if (props.deal.price == null) return 0;
  return Math.min(100, (props.deal.price / props.budget) * 100);
});
const overBudget = computed(() => props.deal.price != null && props.deal.price > props.budget);

const scoreTone = computed(() => {
  const score = props.deal.score ?? 0;
  if (score >= 65) return "high";
  if (score >= 45) return "mid";
  return "low";
});

const countdown = computed(() => {
  if (!props.deal.isAuction || !props.deal.endDate) return null;
  const msLeft = new Date(props.deal.endDate).getTime() - props.now;
  if (msLeft <= 0) return { text: "cerrada", urgent: false, over: true };

  const minutes = Math.floor(msLeft / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const text = days > 0 ? `${days}d ${hours % 24}h` : hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  return { text, urgent: hours < 6, over: false };
});

const seenAgo = computed(() => {
  const minutes = Math.floor((props.now - new Date(props.deal.firstSeenAt).getTime()) / 60_000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
});
</script>

<template>
  <a
    class="row"
    :class="{ 'is-great': deal.isGreatDeal, 'needs-review': flags.length > 0 }"
    :href="deal.url"
    target="_blank"
    rel="noopener noreferrer"
  >
    <span class="stripe" aria-hidden="true"></span>

    <div class="thumb">
      <img v-if="deal.imageUrl" :src="deal.imageUrl" loading="lazy" alt="" />
      <span v-else class="thumb-fallback mono">{{ brandInitials(deal.title) }}</span>
    </div>

    <div class="main">
      <h3 class="title">{{ deal.title }}</h3>
      <div class="specs">
        <span v-for="spec in specs" :key="spec" class="spec">{{ spec }}</span>
        <span v-if="deal.condition" class="spec spec-condition">{{ deal.condition }}</span>
      </div>
      <p v-if="flags.length > 0" class="flags">{{ flags.join(" · ") }}</p>
    </div>

    <div class="price-block">
      <div class="price mono">
        <span class="currency">$</span>{{ Math.round(deal.price ?? 0) }}
        <span v-if="deal.isAuction" class="price-note">puja actual</span>
      </div>
      <div class="budget" :class="{ over: overBudget }">
        <span class="budget-fill" :style="{ width: `${budgetFill}%` }"></span>
      </div>
      <span class="budget-label label">
        {{ overBudget ? `sobre tope · negociable` : `queda $${Math.max(0, budget - Math.round(deal.price ?? 0))}` }}
      </span>
    </div>

    <div class="score" :data-tone="scoreTone">
      <span class="score-value mono">{{ deal.score ?? "—" }}</span>
      <span class="label">pts</span>
    </div>

    <div class="meta">
      <span v-if="countdown" class="countdown mono" :class="{ urgent: countdown.urgent, over: countdown.over }">
        {{ countdown.over ? "cerrada" : `cierra en ${countdown.text}` }}
      </span>
      <span v-else-if="deal.isAuction" class="countdown mono">subasta</span>
      <span class="seen label">vista hace {{ seenAgo }}</span>
    </div>
  </a>
</template>

<style scoped>
.row {
  position: relative;
  display: grid;
  grid-template-columns: 4px 68px minmax(0, 1fr) 132px 52px 108px;
  align-items: center;
  gap: 16px;
  padding: 12px 18px 12px 0;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 8px;
  box-shadow: var(--shadow-row);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.12s ease, transform 0.12s ease;
}
.row:hover {
  border-color: var(--rule-strong);
  transform: translateY(-1px);
}

/* La franja codifica el estado en la forma, no solo en el texto. */
.stripe {
  align-self: stretch;
  border-radius: 8px 0 0 8px;
  background: transparent;
}
.row.is-great .stripe {
  background: var(--good);
}
.row.needs-review .stripe {
  background: var(--warn);
}

.thumb {
  width: 68px;
  height: 52px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 5px;
  background: var(--surface-sunk);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.thumb-fallback {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-3);
}

.main {
  min-width: 0;
}
.title {
  margin: 0 0 5px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}
.specs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.spec {
  font-family: "IBM Plex Mono", monospace;
  font-size: 11px;
  color: var(--ink-2);
  background: var(--surface-sunk);
  border-radius: 4px;
  padding: 1px 6px;
}
.spec-condition {
  background: transparent;
  border: 1px solid var(--rule);
}
.flags {
  margin: 6px 0 0;
  font-size: 11.5px;
  color: var(--warn);
}

.price-block {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.price {
  font-size: 21px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ink);
  white-space: nowrap;
}
.currency {
  font-size: 13px;
  color: var(--ink-3);
  margin-right: 1px;
}
.price-note {
  display: block;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 10.5px;
  font-weight: 400;
  color: var(--ink-3);
}
.budget {
  height: 3px;
  border-radius: 2px;
  background: var(--surface-sunk);
  overflow: hidden;
}
.budget-fill {
  display: block;
  height: 100%;
  background: var(--good);
}
.budget.over .budget-fill {
  background: var(--warn);
}
.budget-label {
  color: var(--ink-3);
}

.score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.1;
}
.score-value {
  font-size: 19px;
  font-weight: 600;
}
.score[data-tone="high"] .score-value {
  color: var(--good);
}
.score[data-tone="mid"] .score-value {
  color: var(--ink);
}
.score[data-tone="low"] .score-value {
  color: var(--ink-3);
}

.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  text-align: right;
}
.countdown {
  font-size: 11.5px;
  color: var(--ink-2);
  white-space: nowrap;
}
.countdown.urgent {
  color: var(--urgent);
  font-weight: 600;
}
.countdown.over {
  color: var(--ink-3);
  text-decoration: line-through;
}

@media (max-width: 860px) {
  .row {
    grid-template-columns: 4px 56px minmax(0, 1fr) auto;
    row-gap: 10px;
    padding-bottom: 14px;
  }
  .score,
  .meta {
    grid-column: 3 / -1;
    flex-direction: row;
    align-items: baseline;
    justify-content: flex-start;
    gap: 8px;
  }
  .price-block {
    align-items: flex-end;
  }
}
</style>
