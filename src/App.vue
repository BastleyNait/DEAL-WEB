<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { SupabaseDealsRepository } from "./infrastructure/SupabaseDealsRepository";
import { SupabaseSeenRepository } from "./infrastructure/SupabaseSeenRepository";
import { SupabasePublishClient } from "./infrastructure/SupabasePublishClient";
import { SupabasePublicationStatusRepository } from "./infrastructure/SupabasePublicationStatusRepository";
import { SupabasePublisherStatusRepository } from "./infrastructure/SupabasePublisherStatusRepository";
import { usePublisherStatus } from "./composables/usePublisherStatus";
import FacebookQueuePanel from "./components/FacebookQueuePanel.vue";
import { useDeals } from "./composables/useDeals";
import { useClock } from "./composables/useClock";
import { useTheme } from "./composables/useTheme";
import { useLayout } from "./composables/useLayout";
import { useSeenDeals } from "./composables/useSeenDeals";
import { usePublications } from "./composables/usePublications";
import DeskHeader from "./components/DeskHeader.vue";
import Toolbar from "./components/Toolbar.vue";
import DealList from "./components/DealList.vue";
import DealDetail from "./components/DealDetail.vue";
import PublishPanel from "./components/PublishPanel.vue";
import type { Deal } from "./domain/types";

// Tope de presupuesto del backend (search_config.maxPriceUsd): cada precio se
// muestra en relación a este límite, que es la regla real de compra.
const BUDGET_USD = 200;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const misconfigured = !supabaseUrl || !anonKey;

// Composition root del frontend: acá (y solo acá) se elige la implementación
// concreta del repositorio. El resto de la app solo conoce DealsRepository.
const repository = new SupabaseDealsRepository(supabaseUrl, anonKey);
const { isSeen, markSeen, toggleSeen, syncError } = useSeenDeals(new SupabaseSeenRepository(supabaseUrl, anonKey));
const { deals, loading, error, lastUpdated, view, format, sortBy, query, visibleDeals, counts, reload } = useDeals(
  repository,
  isSeen,
);
const now = useClock();
const { toggle: toggleTheme } = useTheme();
const { layout, columns } = useLayout();

// Publicación en un click: link de eBay -> borrador en la tienda propia (y a
// futuro Facebook, vía el worker local que consume la cola de `publications`).
const publishToken = import.meta.env.VITE_PUBLISH_TOKEN ?? "";
const publishClient = new SupabasePublishClient(supabaseUrl, publishToken);
const { byItemId: publishedByItemId, reload: reloadPublications } = usePublications(
  new SupabasePublicationStatusRepository(supabaseUrl, anonKey),
);
const isPublished = (itemId: string) => publishedByItemId.value.has(itemId);

// Facebook: el programa de tu PC (DEAL PUBLISHER) toma la cola y publica. Esta
// página no puede encenderlo ni mirarlo directo: él avisa su estado y el
// botón Iniciar abre un enlace que registraste una vez en tu PC.
const {
  status: publisherStatus,
  loaded: publisherLoaded,
  refresh: refreshPublisher,
} = usePublisherStatus(new SupabasePublisherStatusRepository(supabaseUrl, anonKey));
const publicationList = computed(() => [...publishedByItemId.value.values()]);
const facebookQueued = computed(() => publicationList.value.filter((p) => p.facebookStatus === "queued").length);

const facebookOpen = ref(false);
// Con el panel abierto se mira más seguido: ahí se espera ver cambiar el estado.
let fastPoll: ReturnType<typeof setInterval> | undefined;
watch(facebookOpen, (open) => {
  clearInterval(fastPoll);
  if (!open) return;
  refreshPublisher();
  reloadPublications();
  fastPoll = setInterval(() => {
    refreshPublisher();
    reloadPublications();
  }, 4000);
});
onBeforeUnmount(() => clearInterval(fastPoll));

const publishOpen = ref(false);
const publishPrefillUrl = ref<string | undefined>(undefined);

function openPublish(url?: string) {
  publishPrefillUrl.value = url;
  publishOpen.value = true;
}
function closePublish() {
  publishOpen.value = false;
  publishPrefillUrl.value = undefined;
}

// Abrir el detalle cuenta como haberla revisado.
const openedDeal = ref<Deal | null>(null);
// La lista de navegación se congela al abrir: como abrir marca la oferta como
// vista, si se navegara sobre la lista viva la oferta actual desaparecería de
// ella (en la vista "Sin ver") y el "siguiente" saltaría de forma impredecible.
const navList = ref<Deal[]>([]);

function openDeal(deal: Deal) {
  navList.value = [...visibleDeals.value];
  openedDeal.value = deal;
  markSeen(deal.itemId);
}

const navIndex = computed(() =>
  openedDeal.value ? navList.value.findIndex((d) => d.itemId === openedDeal.value!.itemId) : -1,
);
const hasPrev = computed(() => navIndex.value > 0);
const hasNext = computed(() => navIndex.value >= 0 && navIndex.value < navList.value.length - 1);
const navPosition = computed(() => (navIndex.value >= 0 ? `${navIndex.value + 1} de ${navList.value.length}` : ""));

function stepDeal(delta: number) {
  const target = navList.value[navIndex.value + delta];
  if (!target) return;
  openedDeal.value = target;
  markSeen(target.itemId);
}

// La oferta abierta se vuelve a leer de los datos frescos en cada refresco,
// para que el modal no quede mostrando un precio viejo mientras está abierto.
const detailDeal = computed(() =>
  openedDeal.value ? (deals.value.find((d) => d.itemId === openedDeal.value!.itemId) ?? openedDeal.value) : null,
);

const emptyHint = computed(() => {
  if (query.value.trim()) return `Ningún equipo coincide con “${query.value.trim()}”.`;
  if (format.value === "auction") return "No hay subastas abiertas que cumplan el criterio.";
  if (view.value === "unseen") return "Ya revisaste todas las ofertas guardadas. Van a aparecer nuevas en el próximo barrido.";
  if (view.value === "special")
    return "Ahora mismo no hay ninguna laptop 2 en 1 disponible que cumpla el criterio. El cazador las busca en cada pasada.";
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
    <DeskHeader
      :counts="counts"
      :last-updated="lastUpdated"
      :loading="loading"
      :sync-error="syncError"
      @refresh="reload"
      @toggle-theme="toggleTheme"
      :facebook-queued="facebookQueued"
      :publisher-state="publisherStatus.state"
      @publish="openPublish()"
      @facebook="facebookOpen = true"
    />

    <Toolbar
      v-model:view="view"
      v-model:format="format"
      v-model:layout="layout"
      v-model:columns="columns"
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
        :columns="columns"
        :is-seen="isSeen"
        :is-published="isPublished"
        :empty-hint="emptyHint"
        @open="openDeal"
        @toggle-seen="toggleSeen"
      />
    </main>

    <DealDetail
      v-if="detailDeal"
      :deal="detailDeal"
      :budget="BUDGET_USD"
      :now="now"
      :seen="isSeen(detailDeal.itemId)"
      :repository="repository"
      :has-prev="hasPrev"
      :has-next="hasNext"
      :position="navPosition"
      @close="openedDeal = null"
      @toggle-seen="toggleSeen"
      @prev="stepDeal(-1)"
      @next="stepDeal(1)"
      @publish="openPublish"
    />

    <PublishPanel
      v-if="publishOpen"
      :client="publishClient"
      :prefilled-url="publishPrefillUrl"
      @close="closePublish"
      @published="reloadPublications"
    />

    <FacebookQueuePanel
      v-if="facebookOpen"
      :client="publishClient"
      :publications="publicationList"
      :publisher="publisherStatus"
      :publisher-loaded="publisherLoaded"
      @close="facebookOpen = false"
      @changed="reloadPublications"
    />
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
