<script setup lang="ts">
import type { Deal } from "../domain/types";
import { brandInitials } from "../domain/listing-specs";
import { useDealPresentation } from "../composables/useDealPresentation";

const props = defineProps<{ deal: Deal; budget: number; now: number; seen: boolean }>();
const emit = defineEmits<{ open: [string]; toggleSeen: [string] }>();

const { specs, flags, overBudget, scoreTone, countdown, seller, seenAgo } = useDealPresentation(
  () => props.deal,
  () => props.budget,
  () => props.now,
);
</script>

<template>
  <div class="wrap" :class="{ seen }">
    <a
      class="row"
      :class="{ 'is-great': deal.isGreatDeal, 'needs-review': flags.length > 0 }"
      :href="deal.url"
      target="_blank"
      rel="noopener noreferrer"
      @click="emit('open', deal.itemId)"
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
        </div>
        <span v-if="deal.isAuction" class="price-note">puja actual</span>
        <span v-else-if="deal.hasBestOffer" class="price-note negotiable">acepta oferta</span>
        <span v-if="overBudget" class="price-note over">sobre tope · negociar</span>
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
        <span v-if="seller" class="seller mono" :title="deal.sellerUsername ?? ''">{{ seller }}</span>
        <span class="label">vista hace {{ seenAgo }}</span>
      </div>
    </a>

    <!-- Fuera del <a> porque no se puede anidar un botón dentro de un enlace. -->
    <button
      type="button"
      class="seen-toggle"
      :aria-pressed="seen"
      :title="seen ? 'Marcar como no vista' : 'Marcar como vista'"
      @click="emit('toggleSeen', deal.itemId)"
    >
      {{ seen ? "visto" : "marcar" }}
    </button>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
}
/* Lo ya revisado se apaga en vez de desaparecer: sigue estando si lo buscás. */
.wrap.seen .row {
  opacity: 0.45;
}
.wrap.seen:hover .row {
  opacity: 0.75;
}

.row {
  position: relative;
  display: grid;
  grid-template-columns: 4px 68px minmax(0, 1fr) 132px 52px 108px;
  align-items: center;
  gap: 16px;
  padding: 12px 74px 12px 0;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 8px;
  box-shadow: var(--shadow-row);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.12s ease, transform 0.12s ease, opacity 0.12s ease;
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

.seen-toggle {
  position: absolute;
  top: 10px;
  right: 10px;
  font-family: "IBM Plex Mono", monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 5px;
  padding: 3px 7px;
  cursor: pointer;
}
.seen-toggle:hover {
  color: var(--link);
  border-color: var(--link);
}
.seen-toggle[aria-pressed="true"] {
  color: var(--ink-2);
  border-color: var(--rule-strong);
}

.thumb {
  width: 68px;
  height: 52px;
  position: relative;
  overflow: hidden;
  border-radius: 5px;
  background: var(--surface-sunk);
  display: grid;
  place-items: center;
}
.thumb img {
  position: absolute;
  inset: 0;
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
  gap: 2px;
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
  font-size: 10.5px;
  color: var(--ink-3);
}
.price-note.negotiable {
  color: var(--link);
}
.price-note.over {
  color: var(--warn);
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
.seller {
  font-size: 11px;
  color: var(--ink-3);
  white-space: nowrap;
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
