<script setup lang="ts">
import type { Deal } from "../domain/types";
import { brandInitials } from "../domain/listing-specs";
import { useDealPresentation } from "../composables/useDealPresentation";

const props = defineProps<{ deal: Deal; budget: number; now: number; seen: boolean; published: boolean }>();
const emit = defineEmits<{ open: [Deal]; toggleSeen: [string] }>();

const { specs, flags, overBudget, scoreTone, countdown, seller, seenAgo, checkedAgo, bids } = useDealPresentation(
  () => props.deal,
  () => props.budget,
  () => props.now,
);
</script>

<template>
  <div class="wrap" :class="{ seen }">
    <button
      type="button"
      class="card"
      :class="{ 'is-great': deal.isGreatDeal, 'needs-review': flags.length > 0 }"
      @click="emit('open', deal)"
    >
      <div class="shot">
        <img v-if="deal.imageUrl" :src="deal.imageUrl" loading="lazy" alt="" />
        <span v-else class="shot-fallback mono">{{ brandInitials(deal.title) }}</span>

        <!-- El cierre de una subasta es información urgente: va sobre la foto,
             donde se ve antes que cualquier otra cosa de la tarjeta. -->
        <span v-if="countdown" class="format mono" :data-level="countdown.level">
          {{ countdown.over ? "cerrada" : `⏳ ${countdown.text}` }}
        </span>
        <span v-else-if="deal.hasBestOffer" class="format mono negotiable">acepta oferta</span>
      </div>

      <div class="body">
        <h3 class="title">{{ deal.title }}</h3>

        <div class="specs">
          <span v-if="deal.cpuMatch" class="spec" :class="{ 'spec-priority': deal.isPriority }">
            {{ deal.isPriority ? "★ " : "" }}{{ deal.cpuMatch }}
          </span>
          <span v-for="spec in specs" :key="spec" class="spec">{{ spec }}</span>
          <span v-if="deal.condition" class="spec spec-condition">{{ deal.condition }}</span>
          <span v-if="published" class="spec spec-published">🏬 en tienda</span>
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

        <p class="checked">
          {{ deal.isAuction ? `puja actual${bids ? ` · ${bids}` : ""} · ` : "" }}{{
            checkedAgo ? `verificado hace ${checkedAgo}` : "sin verificar"
          }}
        </p>

        <!-- En una subasta el cierre decide si hay que pujar ya o se puede
             mirar mañana, así que va junto al precio y no solo sobre la foto. -->
        <div v-if="countdown" class="closing mono" :data-level="countdown.level">
          {{ countdown.over ? "Subasta cerrada" : `Cierra en ${countdown.text}` }}
        </div>

        <div class="footer">
          <span v-if="overBudget" class="label over">{{ deal.isAuction ? "ya pasó tu tope" : "sobre tope · negociar" }}</span>
          <span v-else-if="seller" class="seller mono">{{ seller }}</span>
          <span v-else></span>
          <span class="label">hace {{ seenAgo }}</span>
        </div>
      </div>
    </button>

    <!-- Fuera de la tarjeta para que no dispare también la apertura del detalle. -->
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
  display: flex;
  width: 100%;
}
/* Lo ya revisado se apaga en vez de desaparecer: sigue estando si lo buscás. */
.wrap.seen .card {
  opacity: 0.45;
}
.wrap.seen:hover .card {
  opacity: 0.8;
}

.card {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0;
  font: inherit;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-top: 3px solid var(--rule-strong);
  border-radius: 8px;
  overflow: hidden;
  color: inherit;
  cursor: pointer;
  box-shadow: var(--shadow-row);
  transition: border-color 0.12s ease, transform 0.12s ease, opacity 0.12s ease;
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

.seen-toggle {
  position: absolute;
  top: 9px;
  right: 9px;
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
/* Escalones de urgencia: cuanto menos queda, más grita. */
.format[data-level="soon"] {
  color: var(--warn);
  border-color: var(--warn);
}
.format[data-level="urgent"],
.format[data-level="critical"] {
  color: var(--urgent);
  border-color: var(--urgent);
  font-weight: 600;
}
.format[data-level="over"] {
  color: var(--ink-3);
  text-decoration: line-through;
}

.closing {
  font-size: 11.5px;
  font-weight: 500;
  text-align: center;
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--ink-2);
  background: var(--surface-sunk);
}
.closing[data-level="soon"] {
  color: var(--warn);
  background: var(--warn-soft);
}
.closing[data-level="urgent"],
.closing[data-level="critical"] {
  color: var(--urgent);
  background: var(--urgent-soft);
  font-weight: 600;
}
.closing[data-level="over"] {
  color: var(--ink-3);
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
/* La prioridad es la CPU, así que se resalta el chip de la CPU en vez de
   agregar otra insignia que compita con las que ya están. */
.spec-priority {
  color: var(--link);
  background: var(--link-soft);
  font-weight: 500;
}
.spec-published {
  color: var(--good);
  background: transparent;
  border: 1px solid var(--good);
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

.checked {
  margin: -4px 0 0;
  font-size: 10.5px;
  color: var(--ink-3);
}

.footer {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.footer .over {
  color: var(--warn);
}
.seller {
  font-size: 10.5px;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
