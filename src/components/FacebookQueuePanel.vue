<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type {
  FacebookStatus,
  PublicationStatus,
  PublishClient,
  PublisherStatus,
  StoreLaptop,
} from "../domain/publish-types";

const props = defineProps<{
  client: PublishClient;
  publications: PublicationStatus[];
  publisher: PublisherStatus;
  publisherLoaded: boolean;
}>();
const emit = defineEmits<{ close: []; changed: [] }>();

const LAUNCH_URL = "revolt-fb://start";
// Cuánto esperar a que el publicador empiece a latir antes de mostrar el plan B.
const LAUNCH_GRACE_MS = 25_000;

const count = (status: FacebookStatus) => props.publications.filter((p) => p.facebookStatus === status).length;

// --- Catálogo: todas las laptops que hay AHORA en revolt-laptops.com ----------
// Se lee de la tienda cada vez que se abre el panel (y con "↻ Actualizar"), así
// que lo que cambiaste en /admin se ve acá. La foto, el precio y las specs son
// lo que permite distinguir dos "Laptop Lenovo — 16GB RAM, 512GB SSD".
const catalog = ref<StoreLaptop[]>([]);
const catalogLoading = ref(true);
const catalogError = ref<string | null>(null);

async function loadCatalog() {
  catalogLoading.value = true;
  catalogError.value = null;
  try {
    catalog.value = await props.client.storeCatalog();
  } catch (err) {
    catalogError.value = err instanceof Error ? err.message : String(err);
  } finally {
    catalogLoading.value = false;
  }
}
onMounted(loadCatalog);

const publicationBySlug = computed(() => {
  const map = new Map<string, PublicationStatus>();
  for (const p of props.publications) if (p.storeSlug) map.set(p.storeSlug, p);
  return map;
});

// "none" = todavía no pasó por la cola de Facebook (incluye las que no tienen fila).
const statusOf = (laptop: StoreLaptop): FacebookStatus =>
  publicationBySlug.value.get(laptop.slug)?.facebookStatus ?? "none";

const STATUS_ORDER: Record<FacebookStatus, number> = { queued: 0, failed: 1, none: 2, skipped: 3, posted: 4 };
const STATUS_BADGE: Record<FacebookStatus, string> = {
  queued: "En cola",
  failed: "Falló",
  none: "Sin publicar en Facebook",
  skipped: "Salteada",
  posted: "Ya publicada",
};

const laptops = computed(() =>
  [...catalog.value].sort(
    (a, b) =>
      Number(b.isActive) - Number(a.isActive) ||
      STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)] ||
      a.name.localeCompare(b.name),
  ),
);

const specsLine = (l: StoreLaptop) => [l.processor, l.ram, l.storage].filter(Boolean).join(" · ");
const priceText = (l: StoreLaptop) =>
  `${l.currency === "PEN" ? "S/" : l.currency} ${Math.round(l.price).toLocaleString("es-PE")}`;
const storeUrl = (l: StoreLaptop) => `https://revolt-laptops.com/laptops/${l.slug}`;
const canQueue = (l: StoreLaptop) => ["none", "skipped", "failed"].includes(statusOf(l));

// Publicaciones que ya no coinciden con ninguna laptop de la tienda (borradas en
// /admin): se siguen mostrando para no perderlas de vista.
const orphans = computed(() => {
  if (catalog.value.length === 0) return [];
  const slugs = new Set(catalog.value.map((l) => l.slug));
  return props.publications.filter((p) => !p.storeSlug || !slugs.has(p.storeSlug));
});

const online = computed(() => props.publisher.state !== "offline");
const stateText = computed(() => {
  switch (props.publisher.state) {
    case "idle":
      return "En línea, esperando trabajo";
    case "working":
      return props.publisher.currentTitle ? `Publicando: ${props.publisher.currentTitle}` : "Publicando…";
    case "waiting_confirm":
      return "Esperando tu click en la ventana de Facebook (Publicar / Saltear)";
    default:
      return props.publisherLoaded ? "Apagado" : "Revisando…";
  }
});

// Iniciar: abre revolt-fb:// (lo registra `npm run install-launcher`). La página
// no puede saber si el enlace funcionó; lo único que sirve es ver si el
// publicador empieza a latir.
const launching = ref(false);
const launchTimedOut = ref(false);
let launchTimer: ReturnType<typeof setTimeout> | undefined;

function startPublisher() {
  launchTimedOut.value = false;
  launching.value = true;
  window.location.href = LAUNCH_URL;
  clearTimeout(launchTimer);
  launchTimer = setTimeout(() => {
    launching.value = false;
    launchTimedOut.value = true;
  }, LAUNCH_GRACE_MS);
}

watch(online, (isOn) => {
  if (!isOn) return;
  clearTimeout(launchTimer);
  launching.value = false;
  launchTimedOut.value = false;
});
onBeforeUnmount(() => clearTimeout(launchTimer));

const busy = ref(false);
const message = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

async function run(job: () => Promise<string>) {
  busy.value = true;
  errorMessage.value = null;
  message.value = null;
  try {
    message.value = await job();
    emit("changed");
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

async function queueIds(itemIds: string[] | undefined, what: string): Promise<string> {
  const moved = await props.client.queueFacebook(itemIds);
  return moved > 0 ? `${moved} ${what} pasaron a la cola.` : "No había nada para encolar.";
}

// Una laptop de la tienda: si ya tiene fila en publications se encola por id; si
// la cargaste directo en /admin, el backend le crea la fila primero.
async function queueLaptop(laptop: StoreLaptop) {
  const pub = publicationBySlug.value.get(laptop.slug);
  if (pub) await queueIds([pub.itemId], "publicación");
  else await props.client.queueStoreProduct(laptop.productId);
}

const retryFailed = () => run(() => queueIds(undefined, "fallidas"));
const queueOne = (laptop: StoreLaptop) =>
  run(async () => {
    await queueLaptop(laptop);
    return `“${laptop.name}” pasó a la cola.`;
  });
const queueOrphan = (itemId: string) => run(() => queueIds([itemId], "publicación"));

// Solo las activas: un borrador todavía no está en la tienda, se encola a mano.
const pendingLaptops = computed(() =>
  laptops.value.filter((l) => l.isActive && ["none", "skipped"].includes(statusOf(l))),
);
const queueAllPending = () =>
  run(async () => {
    const batch = [...pendingLaptops.value];
    for (const laptop of batch) await queueLaptop(laptop);
    return `${batch.length} laptops pasaron a la cola.`;
  });
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div class="dialog" role="dialog" aria-modal="true" aria-label="Publicar en Facebook">
      <header class="head">
        <div class="head-main">
          <h2>Facebook Marketplace</h2>
          <p class="sub label">las publica el programa de tu PC, con tu sesión de Facebook</p>
        </div>
        <button type="button" class="close" aria-label="Cerrar" @click="emit('close')">✕</button>
      </header>

      <div class="content">
        <section class="status" :class="{ on: online }">
          <span class="dot" :class="publisher.state" aria-hidden="true"></span>
          <p class="state-text">{{ stateText }}</p>
          <button v-if="!online" type="button" class="primary" :disabled="launching" @click="startPublisher">
            {{ launching ? "Encendiendo…" : "▶ Iniciar publicador" }}
          </button>
        </section>

        <p v-if="launching" class="hint">
          Se está abriendo en tu PC. Si el navegador pregunta si abrir “Publicador de Facebook”, aceptá y marcá
          “Permitir siempre”.
        </p>
        <div v-if="launchTimedOut && !online" class="notice">
          <p>No arrancó. Tenés dos formas de encenderlo:</p>
          <ul>
            <li>Doble click en <code>Iniciar-Publicador.bat</code>, en la carpeta DEAL PUBLISHER.</li>
            <li>
              Para que este botón funcione, corré una sola vez <code>npm run install-launcher</code> en esa carpeta.
            </li>
          </ul>
        </div>
        <p v-if="publisher.state === 'waiting_confirm'" class="hint strong">
          Andá a la ventana de Facebook: abajo a la derecha está el panel con Publicar / Saltear.
        </p>

        <div class="actions">
          <button type="button" class="ghost" :disabled="busy || count('failed') === 0" @click="retryFailed">
            Reintentar fallidas ({{ count("failed") }})
          </button>
          <button type="button" class="ghost" :disabled="busy || pendingLaptops.length === 0" @click="queueAllPending">
            Encolar las {{ pendingLaptops.length }} que faltan
          </button>
          <button type="button" class="ghost" :disabled="catalogLoading" @click="loadCatalog">
            {{ catalogLoading ? "Leyendo la tienda…" : "↻ Actualizar" }}
          </button>
        </div>
        <p v-if="message" class="hint ok">{{ message }}</p>
        <p v-if="errorMessage" class="notice error">{{ errorMessage }}</p>

        <p v-if="catalogError" class="notice error">No se pudo leer la tienda: {{ catalogError }}</p>
        <p v-else-if="catalogLoading && catalog.length === 0" class="empty">
          Leyendo las laptops de revolt-laptops.com…
        </p>

        <section v-if="laptops.length" class="group">
          <h3 class="label">Laptops en revolt-laptops.com · {{ laptops.length }}</h3>
          <ul>
            <li v-for="l in laptops" :key="l.productId" class="laptop" :class="{ draft: !l.isActive }">
              <a :href="storeUrl(l)" target="_blank" rel="noopener" class="thumb" title="Abrir en la tienda">
                <img v-if="l.image" :src="l.image" :alt="l.name" loading="lazy" decoding="async" />
                <span v-else class="no-photo">sin foto</span>
              </a>
              <div class="info">
                <p class="name">{{ l.name }}</p>
                <p v-if="specsLine(l)" class="specs mono">{{ specsLine(l) }}</p>
                <p class="meta">
                  <strong class="price mono">{{ priceText(l) }}</strong>
                  <span class="chip" :class="{ warn: !l.isActive }">{{ l.isActive ? "Activa" : "Borrador" }}</span>
                  <span v-if="l.inTransit" class="chip">En camino</span>
                  <span class="chip fb" :class="statusOf(l)">{{ STATUS_BADGE[statusOf(l)] }}</span>
                  <span class="photos">{{ l.photos }} fotos</span>
                </p>
              </div>
              <button v-if="canQueue(l)" type="button" class="mini" :disabled="busy" @click="queueOne(l)">
                {{ statusOf(l) === "failed" ? "Reintentar" : "Encolar" }}
              </button>
            </li>
          </ul>
        </section>

        <section v-if="orphans.length" class="group">
          <h3 class="label">Otras publicaciones (ya no están en la tienda) · {{ orphans.length }}</h3>
          <ul>
            <li v-for="p in orphans" :key="p.itemId" class="item">
              <span class="item-title">
                {{ p.title ?? p.itemId }}
                <span class="chip fb" :class="p.facebookStatus">{{ STATUS_BADGE[p.facebookStatus] }}</span>
              </span>
              <button
                v-if="p.facebookStatus === 'none' || p.facebookStatus === 'skipped' || p.facebookStatus === 'failed'"
                type="button"
                class="mini"
                :disabled="busy"
                @click="queueOrphan(p.itemId)"
              >
                {{ p.facebookStatus === "failed" ? "Reintentar" : "Encolar" }}
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(8, 11, 15, 0.62);
  backdrop-filter: blur(2px);
}

.dialog {
  display: flex;
  flex-direction: column;
  width: min(700px, 100%);
  max-height: min(86vh, 760px);
  background: var(--surface);
  border: 1px solid var(--rule-strong);
  border-radius: 12px;
  overflow: hidden;
}

.head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--rule);
}
.head-main {
  flex: 1;
}
.head-main h2 {
  margin: 0 0 3px;
  font-size: 16px;
  font-weight: 600;
}
.sub {
  margin: 0;
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
  padding: 18px;
  overflow-y: auto;
}

.label {
  display: block;
  font-family: "IBM Plex Mono", monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--surface-sunk);
  border: 1px solid var(--rule);
  border-radius: 8px;
}
.state-text {
  flex: 1;
  margin: 0;
  font-size: 13.5px;
}
.dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--ink-3);
}
.dot.idle,
.dot.working {
  background: var(--good);
}
.dot.waiting_confirm {
  background: var(--warn);
}

.hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--ink-3);
}
.hint.strong {
  color: var(--warn);
  font-weight: 600;
}
.hint.ok {
  color: var(--good);
}

.notice {
  margin-top: 10px;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12.5px;
  color: var(--ink-2);
  background: var(--surface-sunk);
  border: 1px solid var(--rule);
}
.notice p {
  margin: 0 0 4px;
}
.notice ul {
  margin: 0;
  padding-left: 18px;
}
.notice.error {
  background: var(--urgent-soft, rgba(220, 60, 60, 0.1));
  color: var(--urgent);
  border-color: var(--urgent);
}
code {
  font-family: "IBM Plex Mono", monospace;
  font-size: 12px;
  background: var(--surface);
  border-radius: 4px;
  padding: 1px 5px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.empty {
  margin: 20px 0 0;
  font-size: 13px;
  color: var(--ink-2);
}

.group {
  margin-top: 18px;
}
.group h3 {
  margin: 0 0 6px;
  font-weight: 500;
}
.group ul {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--rule);
  border-radius: 8px;
}
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  font-size: 13px;
}
.item + .item {
  border-top: 1px solid var(--rule);
}
.item-title {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.laptop {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
}
.laptop + .laptop {
  border-top: 1px solid var(--rule);
}
.laptop.draft {
  background: var(--surface-sunk);
}
.thumb {
  flex: none;
  display: block;
  width: 84px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--surface-sunk);
  border: 1px solid var(--rule);
}
.thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.no-photo {
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 11px;
  color: var(--ink-3);
}
.info {
  flex: 1;
  min-width: 0;
}
.name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.specs {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--ink-2);
}
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 8px;
  margin: 5px 0 0;
  font-size: 12px;
}
.price {
  font-size: 13px;
}
.mono {
  font-family: "IBM Plex Mono", monospace;
}
.photos {
  color: var(--ink-3);
}
.chip {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 99px;
  border: 1px solid var(--rule-strong);
  color: var(--ink-2);
}
.chip.warn {
  color: var(--warn);
  border-color: var(--warn);
}
.chip.fb.queued {
  color: var(--link);
  border-color: var(--link);
}
.chip.fb.posted {
  color: var(--good);
  border-color: var(--good);
}
.chip.fb.failed {
  color: var(--urgent);
  border-color: var(--urgent);
}

.primary {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--surface);
  background: var(--link);
  border: 1px solid var(--link);
  border-radius: 7px;
  padding: 7px 14px;
  cursor: pointer;
}
.primary:disabled,
.ghost:disabled,
.mini:disabled {
  opacity: 0.45;
  cursor: default;
}
.ghost,
.mini {
  font: inherit;
  font-size: 12.5px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--rule-strong);
  border-radius: 7px;
  padding: 6px 12px;
  cursor: pointer;
}
.mini {
  flex: none;
  font-size: 12px;
  padding: 3px 9px;
}
.ghost:hover:not(:disabled),
.mini:hover:not(:disabled) {
  border-color: var(--link);
  color: var(--link);
}
</style>
