<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from "vue";
import type { Deal, DealDetail, DealsRepository } from "../domain/types";
import { useDealPresentation } from "../composables/useDealPresentation";
import { sanitizeDescription, hasRenderableDescription } from "../domain/sanitize-description";

const props = defineProps<{
  deal: Deal;
  budget: number;
  now: number;
  seen: boolean;
  repository: DealsRepository;
  hasPrev: boolean;
  hasNext: boolean;
  position: string;
}>();
const emit = defineEmits<{ close: []; toggleSeen: [string]; prev: []; next: []; publish: [string] }>();

// El detalle pesado se pide recién al abrir, no viene en el listado.
const detail = ref<DealDetail | null>(null);
const detailError = ref<string | null>(null);

watchEffect(async () => {
  const itemId = props.deal.itemId;
  detail.value = null;
  detailError.value = null;
  try {
    const loaded = await props.repository.getDetail(itemId);
    // Si mientras cargaba se abrió otra oferta, se descarta esta respuesta.
    if (props.deal.itemId === itemId) detail.value = loaded;
  } catch (err) {
    detailError.value = err instanceof Error ? err.message : String(err);
  }
});

const descriptionHtml = computed(() => {
  const raw = detail.value?.sellerDescriptionHtml;
  if (raw && hasRenderableDescription(raw)) return sanitizeDescription(raw);
  return null;
});

const { specs, flags, overBudget, scoreTone, countdown, seller, seenAgo, checkedAgo, bids } = useDealPresentation(
  () => props.deal,
  () => props.budget,
  () => props.now,
);

const photos = computed(() => {
  const all = [props.deal.imageUrl, ...(detail.value?.additionalImages ?? [])].filter((u): u is string => Boolean(u));
  return [...new Set(all)];
});

const activePhoto = ref(0);
watch(() => props.deal.itemId, () => (activePhoto.value = 0));

const dialog = ref<HTMLElement | null>(null);

// Las flechas mueven entre ofertas, que es lo que muestran los botones de los
// costados. Las fotos se cambian desde las miniaturas, que están siempre a la
// vista: usar la misma tecla para las dos cosas sería ambiguo.
function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
  if (event.key === "ArrowRight" && props.hasNext) emit("next");
  if (event.key === "ArrowLeft" && props.hasPrev) emit("prev");
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  // Evita que la lista de atrás siga scrolleando mientras el detalle está abierto.
  document.body.style.overflow = "hidden";
  dialog.value?.focus();
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <button
      type="button"
      class="step prev"
      :disabled="!hasPrev"
      aria-label="Oferta anterior"
      @click="emit('prev')"
    >
      ‹
    </button>

    <div
      ref="dialog"
      class="dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="deal.title"
      tabindex="-1"
    >
      <header class="head">
        <div class="head-main">
          <h2>{{ deal.title }}</h2>
          <div class="badges">
            <span v-if="deal.isUrgent" class="badge urgent" title="16GB+ de RAM, SSD de 512GB+, CPU buscada y menos de $250">
              💰 OFERTA URGENTE
            </span>
            <span
              v-if="deal.specialLabel"
              class="badge special"
              :class="{ low: deal.specialDemoted }"
              :title="deal.specialDemoted ? 'Convertible, pero Dell: suelen llegar rayadas o rotas, revisá las fotos' : 'Convertible: se usa como laptop y como tablet'"
            >
              🔄 {{ deal.specialDemoted ? `${deal.specialLabel} · prioridad baja` : `Oferta ${deal.specialLabel}` }}
            </span>
            <span v-if="deal.isPriority" class="badge link">★ CPU prioritaria</span>
            <span v-if="deal.isGreatDeal" class="badge good">Ofertaza</span>
            <span v-if="deal.isAuction" class="badge">Subasta</span>
            <span v-else-if="deal.hasBestOffer" class="badge link">Acepta oferta</span>
            <span v-if="deal.condition" class="badge">{{ deal.condition }}</span>
          </div>
        </div>
        <button type="button" class="close" aria-label="Cerrar" @click="emit('close')">✕</button>
      </header>

      <div class="content">
        <section class="gallery">
          <div class="stage">
            <img v-if="photos.length" :src="photos[activePhoto]" :alt="`Foto ${activePhoto + 1} de ${deal.title}`" />
            <p v-else class="no-photo label">sin fotos guardadas</p>
          </div>
          <div v-if="photos.length > 1" class="thumbs">
            <button
              v-for="(photo, index) in photos"
              :key="photo"
              type="button"
              :class="{ active: index === activePhoto }"
              :aria-label="`Ver foto ${index + 1}`"
              @click="activePhoto = index"
            >
              <img :src="photo" alt="" loading="lazy" />
            </button>
          </div>
        </section>

        <section class="facts">
          <div class="headline">
            <div>
              <div class="price mono">
                <span class="currency">$</span>{{ Math.round(deal.price ?? 0) }}
                <span class="unit label">{{ deal.currency }}</span>
              </div>
              <p v-if="deal.isAuction" class="price-note">puja actual{{ bids ? ` con ${bids}` : "" }}, puede subir</p>
              <p v-else-if="deal.hasBestOffer" class="price-note negotiable">se puede ofertar por menos</p>
              <p v-if="overBudget" class="price-note over">por encima de tu tope de ${{ budget }}<template v-if="deal.isUrgent">, pero entra como oferta urgente (hasta $250)</template></p>
            </div>
            <div class="score" :data-tone="scoreTone">
              <span class="score-value mono">{{ deal.score ?? "—" }}</span>
              <span class="label">puntaje</span>
            </div>
          </div>

          <p v-if="flags.length > 0" class="flags">⚠️ {{ flags.join(" · ") }} — conviene revisarlo</p>

          <dl class="meta">
            <div v-if="countdown">
              <dt class="label">cierre</dt>
              <dd class="countdown" :data-level="countdown.level">
                {{ countdown.over ? "cerrada" : `en ${countdown.text}` }}
              </dd>
            </div>
            <div v-if="seller">
              <dt class="label">vendedor</dt>
              <dd>{{ deal.sellerUsername ?? "—" }} <span class="soft">({{ seller }})</span></dd>
            </div>
            <div>
              <dt class="label">precio verificado</dt>
              <dd>{{ checkedAgo ? `hace ${checkedAgo}` : "todavía no" }}</dd>
            </div>
            <div>
              <dt class="label">detectada</dt>
              <dd>hace {{ seenAgo }}</dd>
            </div>
          </dl>

          <div class="specs">
            <span v-if="deal.cpuMatch" class="spec" :class="{ 'spec-priority': deal.isPriority }">
              {{ deal.cpuMatch }}
            </span>
            <span v-for="spec in specs" :key="spec" class="spec">{{ spec }}</span>
          </div>

          <div v-if="detail?.aspects.length" class="aspects">
            <h3 class="label">Ficha del vendedor</h3>
            <dl>
              <div v-for="aspect in detail.aspects" :key="aspect.name">
                <dt>{{ aspect.name }}</dt>
                <dd>{{ aspect.value }}</dd>
              </div>
            </dl>
          </div>

          <div class="description">
            <h3 class="label">Descripción</h3>
            <p v-if="detailError" class="soft">No se pudo cargar el detalle: {{ detailError }}</p>
            <p v-else-if="!detail" class="soft">Cargando…</p>
            <!-- Saneado con DOMPurify en sanitize-description.ts: lista blanca
                 de etiquetas de formato y cero atributos. -->
            <div v-else-if="descriptionHtml" class="rich" v-html="descriptionHtml"></div>
            <p v-else-if="detail.sellerDescription">{{ detail.sellerDescription }}</p>
            <p v-else class="soft">El vendedor no dejó descripción, o la publicación ya no está disponible.</p>
          </div>
        </section>
      </div>

      <footer class="foot">
        <span class="position label">{{ position }}</span>
        <button type="button" class="ghost" @click="emit('toggleSeen', deal.itemId)">
          {{ seen ? "Marcar como no vista" : "Marcar como vista" }}
        </button>
        <button type="button" class="ghost publish" @click="emit('publish', deal.url)">Publicar</button>
        <a class="primary" :href="deal.url" target="_blank" rel="noopener noreferrer">Abrir en eBay ↗</a>
      </footer>
    </div>

    <button
      type="button"
      class="step next"
      :disabled="!hasNext"
      aria-label="Oferta siguiente"
      @click="emit('next')"
    >
      ›
    </button>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  background: rgba(8, 11, 15, 0.62);
  backdrop-filter: blur(2px);
}

/* Recorrer la lista sin volver a la grilla: el modal es donde se decide. */
.step {
  flex: none;
  width: 40px;
  height: 64px;
  font-size: 26px;
  line-height: 1;
  color: var(--ink-2);
  background: var(--surface);
  border: 1px solid var(--rule-strong);
  border-radius: 8px;
  cursor: pointer;
}
.step:hover:not(:disabled) {
  color: var(--link);
  border-color: var(--link);
}
.step:disabled {
  opacity: 0.3;
  cursor: default;
}

.dialog {
  display: flex;
  flex-direction: column;
  width: min(980px, 100%);
  max-height: min(86vh, 820px);
  background: var(--surface);
  border: 1px solid var(--rule-strong);
  border-radius: 12px;
  overflow: hidden;
}
.dialog:focus {
  outline: none;
}

.head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--rule);
}
.head h2 {
  margin: 0 0 7px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  text-wrap: balance;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.badge {
  font-family: "IBM Plex Mono", monospace;
  font-size: 10.5px;
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--ink-2);
  border: 1px solid var(--rule-strong);
}
.badge.good {
  color: var(--good);
  border-color: var(--good);
}
.badge.link {
  color: var(--link);
  border-color: var(--link);
}
.badge.urgent {
  color: var(--good);
  border-color: var(--good);
  background: var(--good-soft);
  font-weight: 700;
}
.badge.special.low {
  color: var(--ink-3);
  border-color: var(--rule-strong);
  background: transparent;
  font-weight: 400;
}
.badge.special {
  color: var(--special);
  border-color: var(--special);
  background: var(--special-soft);
  font-weight: 600;
}
.close {
  font: inherit;
  font-size: 15px;
  line-height: 1;
  color: var(--ink-3);
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 6px;
  padding: 6px 9px;
  cursor: pointer;
}
.close:hover {
  color: var(--ink);
  border-color: var(--rule-strong);
}

.content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  padding: 18px;
  overflow-y: auto;
}

.stage {
  position: relative;
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: var(--surface-sunk);
}
/* Absoluta a propósito: como ítem de grid centrado, el height:100% resuelve
   contra una altura indefinida y la foto se muestra a tamaño real, recortada
   por el overflow — se ve como si estuviera ampliada. */
.stage img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.no-photo {
  color: var(--ink-3);
}
.thumbs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.thumbs button {
  width: 54px;
  height: 42px;
  padding: 0;
  overflow: hidden;
  background: var(--surface-sunk);
  border: 1px solid var(--rule);
  border-radius: 5px;
  cursor: pointer;
}
.thumbs button.active {
  border-color: var(--link);
}
.thumbs img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.facts {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.headline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.price {
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1;
}
.currency {
  font-size: 16px;
  color: var(--ink-3);
}
.unit {
  margin-left: 3px;
}
.price-note {
  margin: 5px 0 0;
  font-size: 12px;
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
  font-size: 24px;
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

.flags {
  margin: 0;
  font-size: 12.5px;
  color: var(--warn);
  background: var(--warn-soft);
  border-radius: 6px;
  padding: 7px 10px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 22px;
  margin: 0;
}
.meta div {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.meta dd {
  margin: 0;
  font-size: 12.5px;
}
.meta .countdown[data-level="soon"] {
  color: var(--warn);
  font-weight: 600;
}
.meta .countdown[data-level="urgent"],
.meta .countdown[data-level="critical"] {
  color: var(--urgent);
  font-weight: 600;
}
.soft {
  color: var(--ink-3);
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
  padding: 2px 7px;
}
.spec-priority {
  color: var(--link);
  background: var(--link-soft);
  font-weight: 500;
}

.aspects h3,
.description h3 {
  margin: 0 0 6px;
}
.aspects dl {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr);
  gap: 2px 14px;
  margin: 0;
  font-size: 12.5px;
}
.aspects dl div {
  display: contents;
}
.aspects dt {
  color: var(--ink-3);
}
.aspects dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.description p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--ink-2);
  max-height: 220px;
  overflow-y: auto;
  overflow-wrap: anywhere;
}

/*
 * Contenido del vendedor ya saneado. Los estilos son nuestros, no suyos: las
 * plantillas de eBay traen tipografías gigantes y tablas anchísimas que
 * romperían el modal, así que acá se normaliza todo al tamaño del panel.
 */
.rich {
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--ink-2);
  max-height: 260px;
  overflow: auto;
  overflow-wrap: anywhere;
}
.rich :deep(*) {
  max-width: 100%;
  font-size: inherit !important;
  font-family: inherit !important;
  color: inherit !important;
  background: transparent !important;
}
.rich :deep(p),
.rich :deep(div),
.rich :deep(ul),
.rich :deep(ol),
.rich :deep(table) {
  margin: 0 0 8px;
}
.rich :deep(:last-child) {
  margin-bottom: 0;
}
.rich :deep(h1),
.rich :deep(h2),
.rich :deep(h3),
.rich :deep(h4),
.rich :deep(h5),
.rich :deep(h6) {
  margin: 12px 0 5px;
  font-size: 12.5px !important;
  font-weight: 600;
  color: var(--ink) !important;
}
.rich :deep(strong),
.rich :deep(b) {
  font-weight: 600;
  color: var(--ink) !important;
}
.rich :deep(ul),
.rich :deep(ol) {
  padding-left: 18px;
}
.rich :deep(li) {
  margin-bottom: 3px;
}
.rich :deep(table) {
  width: 100%;
  border-collapse: collapse;
  display: block;
  overflow-x: auto;
}
.rich :deep(td),
.rich :deep(th) {
  padding: 3px 8px 3px 0;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--rule);
}
.rich :deep(th) {
  color: var(--ink-3) !important;
  font-weight: 500;
}
.rich :deep(hr) {
  border: 0;
  border-top: 1px solid var(--rule);
  margin: 10px 0;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 13px 18px;
  border-top: 1px solid var(--rule);
  background: var(--surface);
}
.ghost,
.primary {
  font: inherit;
  font-size: 13px;
  border-radius: 6px;
  padding: 8px 14px;
  cursor: pointer;
  text-decoration: none;
}
.ghost {
  color: var(--ink-2);
  background: transparent;
  border: 1px solid var(--rule-strong);
}
.ghost:hover {
  color: var(--ink);
  border-color: var(--link);
}
.ghost.publish {
  color: var(--link);
  border-color: var(--link);
}
.ghost.publish:hover {
  background: var(--link-soft);
}
.primary {
  color: var(--surface);
  background: var(--link);
  border: 1px solid var(--link);
  font-weight: 500;
}
.primary:hover {
  filter: brightness(1.08);
}

.position {
  margin-right: auto;
  color: var(--ink-3);
}

@media (max-width: 780px) {
  .backdrop {
    padding: 0;
    gap: 0;
  }
  /* En pantalla chica los costados no entran: se navega con el pie y el teclado. */
  .step {
    display: none;
  }
  .dialog {
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
  }
  .content {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
