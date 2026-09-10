<script setup lang="ts">
import type { Deal } from "../domain/types";
import { brandInitials } from "../domain/listing-specs";
import { useDealPresentation } from "../composables/useDealPresentation";

const props = defineProps<{ deal: Deal; budget: number; now: number }>();

const { specs, flags, budgetFill, overBudget, remaining, scoreTone, countdown, seller, seenAgo } =
  useDealPresentation(
    () => props.deal,
    () => props.budget,
    () => props.now,
  );
</script>

<template>
  <a
    class="card"
    :class="{ 'is-great': deal.isGreatDeal, 'needs-review': flags.length > 0 }"
    :href="deal.url"
    target="_blank"
    rel="noopener noreferrer"
  >
    <div class="shot">
      <img v-if="deal.imageUrl" :src="deal.imageUrl" loading="lazy" alt="" />
      <span v-else class="shot-fallback mono">{{ brandInitials(deal.title) }}</span>

      <!-- El cierre de una subasta es información urgente: va sobre la foto,
           donde se ve antes que cualquier otra cosa de la tarjeta. -->
      <span
        v-if="countdown"
        class="format mono"
        :class="{ urgent: countdown.urgent, over: countdown.over }"
      >
        {{ countdown.over ? "cerrada" : countdown.text }}
      </span>
      <span v-else-if="deal.isAuction" class="format mono">subasta</span>
      <span v-else-if="deal.hasBestOffer" class="format mono negotiable">acepta oferta</span>
    </div>

    <div class="body">
      <h3 class="title">{{ deal.title }}</h3>

      <div class="specs">
        <span v-for="spec in specs" :key="spec" class="spec">{{ spec }}</span>
        <span v-if="deal.condition" class="spec spec-condition">{{ deal.condition }}</span>
      </div>

      <p v-if="flags.length > 0" class="flags">{{ flags.join(" · ") }}</p>

      <div class="figures">
        <div class="price mono">
          <span class="currency">$</span>{{ Math.round(deal.price ?? 0) }}
        </div>
        <div class="score" :data-tone="scoreTone">
          <span class="score-value mono">{{ deal.score ?? "—" }}</span>
          <span class="label">pts</span>
        </div>
      </div>

      <div class="budget" :class="{ over: overBudget }">
        <span class="budget-fill" :style="{ width: `${budgetFill}%` }"></span>
      </div>

      <div class="footer">
        <span class="label">{{ overBudget ? "sobre tope · negociable" : `queda $${remaining}` }}</span>
        <span class="label">hace {{ seenAgo }}</span>
      </div>

      <p v-if="seller" class="seller mono">{{ seller }}</p>
    </div>
  </a>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-top: 3px solid var(--rule-strong);
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  box-shadow: var(--shadow-row);
  transition: border-color 0.12s ease, transform 0.12s ease;
}
.card:hover {
  transform: translateY(-2px);
  border-color: var(--rule-strong);
}
/* El borde superior codifica el estado, igual que la franja de la lista. */
.card.is-great {
  border-top-color: var(--good);
}
.card.needs-review {
  border-top-color: var(--warn);
}

.shot {
  position: relative;
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--surface-sunk);
}
/* Posicionada en absoluto para que la altura natural de la foto no estire la
   caja: si no, cada tarjeta queda con un alto de imagen distinto. */
.shot img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.shot-fallback {
  font-size: 22px;
  font-weight: 600;
  color: var(--ink-3);
}

.format {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 10.5px;
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--ink-2);
  background: var(--surface);
  border: 1px solid var(--rule-strong);
}
.format.negotiable {
  color: var(--link);
  border-color: var(--link);
}
.format.urgent {
  color: var(--urgent);
  border-color: var(--urgent);
  font-weight: 600;
}
.format.over {
  color: var(--ink-3);
  text-decoration: line-through;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px 14px;
  flex: 1;
}

.title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.specs {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.spec {
  font-family: "IBM Plex Mono", monospace;
  font-size: 10.5px;
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
  margin: 0;
  font-size: 11px;
  color: var(--warn);
}

.figures {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
}
.price {
  font-size: 23px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.currency {
  font-size: 13px;
  color: var(--ink-3);
  margin-right: 1px;
}
.score {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.score-value {
  font-size: 16px;
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

.footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.seller {
  margin: 0;
  font-size: 10.5px;
  color: var(--ink-3);
}
</style>
