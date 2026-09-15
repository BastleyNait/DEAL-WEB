<script setup lang="ts">
import { ref, watch } from "vue";
import type { PublishClient } from "../domain/publish-types";
import { usePublish } from "../composables/usePublish";

const props = defineProps<{
  client: PublishClient;
  /** Si se abre desde una oferta ya conocida, el link viene puesto y se resuelve solo. */
  prefilledUrl?: string;
}>();
const emit = defineEmits<{ close: []; published: [] }>();

// El link a la tienda es un dato público de marketing, no un secreto — no
// hace falta bajarlo del backend para mostrarlo en el mensaje de éxito.
const STORE_BASE_URL = "https://revolt-laptops.vercel.app";

const {
  step,
  errorMessage,
  result,
  originalTitle,
  title,
  description,
  priceUsd,
  images,
  queueForFacebook,
  canPublish,
  reset,
  resolveUrl,
  confirmPublish,
} = usePublish(props.client);

const pastedUrl = ref(props.prefilledUrl ?? "");

watch(
  () => props.prefilledUrl,
  (url) => {
    if (url) {
      pastedUrl.value = url;
      resolveUrl(url);
    }
  },
  { immediate: true },
);

function submitLink() {
  if (pastedUrl.value.trim()) resolveUrl(pastedUrl.value.trim());
}

function startOver() {
  reset();
  pastedUrl.value = "";
}

function onPublished() {
  emit("published");
}

watch(step, (s) => {
  if (s === "done") onPublished();
});
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div class="dialog" role="dialog" aria-modal="true" aria-label="Publicar en la tienda">
      <header class="head">
        <div class="head-main">
          <h2>Publicar</h2>
          <p class="sub label">de un link de eBay a tu tienda, con el precio ya calculado</p>
        </div>
        <button type="button" class="close" aria-label="Cerrar" @click="emit('close')">✕</button>
      </header>

      <div class="content">
        <!-- Paso 1: pegar el link -->
        <div v-if="step === 'idle'" class="step-paste">
          <label class="label" for="ebay-link">Link de la publicación de eBay</label>
          <div class="paste-row">
            <input
              id="ebay-link"
              v-model="pastedUrl"
              type="url"
              placeholder="https://www.ebay.com/itm/..."
              @keyup.enter="submitLink"
            />
            <button type="button" class="primary" :disabled="!pastedUrl.trim()" @click="submitLink">Buscar</button>
          </div>
          <p class="hint">
            Sirve para cualquier laptop que hayas comprado, la haya encontrado el cazador o no.
          </p>
        </div>

        <p v-else-if="step === 'resolving'" class="loading label">buscando la publicación en eBay…</p>

        <div v-else-if="step === 'error'" class="notice error">
          <p>{{ errorMessage }}</p>
          <button type="button" class="ghost" @click="startOver">Probar con otro link</button>
        </div>

        <!-- Paso 2: borrador editable -->
        <div v-else-if="step === 'draft' || step === 'publishing'" class="draft">
          <p class="original label">original: {{ originalTitle }}</p>

          <label class="label" for="pub-title">Título</label>
          <input id="pub-title" v-model="title" type="text" maxlength="100" />
          <p class="hint">{{ title.length }}/100 — tope de Facebook Marketplace.</p>

          <label class="label" for="pub-desc">Descripción</label>
          <textarea id="pub-desc" v-model="description" rows="9"></textarea>

          <label class="label" for="pub-price">Precio de venta (USD)</label>
          <input id="pub-price" v-model.number="priceUsd" type="number" min="1" step="1" />
          <p class="hint">Sugerido con (costo eBay + flete) × margen. Editalo si querés otro número.</p>

          <p class="label">Fotos</p>
          <div class="photos">
            <label v-for="img in images" :key="img.url" class="photo" :class="{ off: !img.selected }">
              <input v-model="img.selected" type="checkbox" />
              <img :src="img.url" alt="" loading="lazy" />
            </label>
          </div>

          <label class="fb-toggle">
            <input v-model="queueForFacebook" type="checkbox" />
            <span>Encolar también para Facebook Marketplace (lo publica el worker local cuando corra)</span>
          </label>

          <p v-if="errorMessage" class="notice error inline">{{ errorMessage }}</p>
        </div>

        <!-- Paso 3: listo -->
        <div v-else-if="step === 'done'" class="done">
          <p class="done-title">Publicado como borrador ✅</p>
          <p class="hint">
            Está oculto en la tienda hasta que lo actives desde tu panel de administración.
          </p>
          <a
            v-if="result"
            class="primary"
            :href="`${STORE_BASE_URL}/products/${result.slug}`"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver borrador en la tienda ↗
          </a>
        </div>
      </div>

      <footer v-if="step === 'draft' || step === 'publishing'" class="foot">
        <button type="button" class="ghost" @click="startOver">Cancelar</button>
        <button type="button" class="primary" :disabled="!canPublish || step === 'publishing'" @click="confirmPublish">
          {{ step === "publishing" ? "Publicando…" : "Publicar en mi tienda" }}
        </button>
      </footer>
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
  width: min(560px, 100%);
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
  margin: 14px 0 5px;
}
.label:first-child {
  margin-top: 0;
}
.hint {
  margin: 5px 0 0;
  font-size: 12px;
  color: var(--ink-3);
}
.original {
  margin: 0 0 4px;
}

input[type="url"],
input[type="text"],
input[type="number"],
textarea {
  width: 100%;
  font: inherit;
  font-size: 13.5px;
  color: var(--ink);
  background: var(--surface-sunk);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 9px 11px;
  box-sizing: border-box;
}
input:focus,
textarea:focus {
  outline: none;
  border-color: var(--link);
}
textarea {
  resize: vertical;
  line-height: 1.5;
  font-family: inherit;
}

.paste-row {
  display: flex;
  gap: 8px;
}
.paste-row input {
  flex: 1;
}

.loading {
  padding: 40px 0;
  text-align: center;
}

.notice {
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 13px;
}
.notice.error {
  background: var(--urgent-soft, rgba(220, 60, 60, 0.1));
  color: var(--urgent);
  border: 1px solid var(--urgent);
}
.notice.inline {
  margin-top: 14px;
}

.photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
}
.photo {
  position: relative;
  display: block;
  aspect-ratio: 4 / 3;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--link);
  cursor: pointer;
}
.photo.off {
  border-color: var(--rule);
  opacity: 0.4;
}
.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.photo input {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 1;
}

.fb-toggle {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
  font-size: 12.5px;
  color: var(--ink-2);
  cursor: pointer;
}
.fb-toggle input {
  margin-top: 2px;
}

.done {
  padding: 20px 0;
  text-align: center;
}
.done-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
}
.done .primary {
  display: inline-block;
  margin-top: 14px;
}

.foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 18px;
  border-top: 1px solid var(--rule);
}

.primary {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--surface);
  background: var(--link);
  border: 1px solid var(--link);
  border-radius: 7px;
  padding: 8px 16px;
  cursor: pointer;
  text-decoration: none;
}
.primary:disabled {
  opacity: 0.45;
  cursor: default;
}
.ghost {
  font: inherit;
  font-size: 13px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--rule-strong);
  border-radius: 7px;
  padding: 8px 14px;
  cursor: pointer;
}
.ghost:hover {
  border-color: var(--link);
  color: var(--link);
}
</style>
