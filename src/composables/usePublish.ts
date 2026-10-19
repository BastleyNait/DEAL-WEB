import { computed, reactive, ref } from "vue";
import type { PublishClient, PublishResult, ResolvedListing } from "../domain/publish-types";

export type PublishStep = "idle" | "resolving" | "draft" | "publishing" | "done" | "error";

interface DraftImage {
  url: string;
  selected: boolean;
}

/**
 * Estado del panel "publicar desde un link": pegar -> resolver -> editar el
 * borrador sugerido -> confirmar. Vive en un composable (no en el componente)
 * para poder abrirlo tanto desde un link pegado a mano como desde el botón
 * "Publicar" del detalle de una oferta ya conocida, sin duplicar la lógica.
 */
export function usePublish(client: PublishClient) {
  const step = ref<PublishStep>("idle");
  const errorMessage = ref<string | null>(null);
  const result = ref<PublishResult | null>(null);

  const itemId = ref("");
  const originalTitle = ref("");
  const ebayUrl = ref("");
  const title = ref("");
  const description = ref("");
  const priceUsd = ref(0);
  const images = reactive<DraftImage[]>([]);
  // true por defecto: el objetivo declarado del sistema es terminar
  // publicando también en Facebook. El worker local lo toma de la cola
  // cuando corre; si nunca corre, esto no publica nada por sí solo.
  const queueForFacebook = ref(true);

  const selectedImageUrls = computed(() => images.filter((i) => i.selected).map((i) => i.url));
  const canPublish = computed(
    () => step.value === "draft" && title.value.trim().length > 0 && priceUsd.value > 0 && selectedImageUrls.value.length > 0,
  );

  function reset() {
    step.value = "idle";
    errorMessage.value = null;
    result.value = null;
    itemId.value = "";
    originalTitle.value = "";
    ebayUrl.value = "";
    title.value = "";
    description.value = "";
    priceUsd.value = 0;
    images.splice(0, images.length);
    queueForFacebook.value = true;
  }

  /** Arma el borrador a partir de lo que trae el backend (sea de un link o de la cola). */
  async function loadDraft(fetchDraft: () => Promise<ResolvedListing>) {
    reset();
    step.value = "resolving";
    try {
      const resolved = await fetchDraft();
      itemId.value = resolved.itemId;
      originalTitle.value = resolved.title;
      ebayUrl.value = resolved.url;
      title.value = resolved.suggestedTitle;
      description.value = resolved.suggestedDescription;
      priceUsd.value = resolved.priceUsd ?? 0;
      images.push(...resolved.images.map((u) => ({ url: u, selected: true })));
      step.value = "draft";
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : String(err);
      step.value = "error";
    }
  }

  const resolveUrl = (url: string) => loadDraft(() => client.resolve(url));

  /**
   * Una compra de la cola: el texto se genera recién acá, la primera vez que se
   * abre, y queda guardado; las siguientes veces sale del caché sin tocar eBay.
   */
  const resolvePurchase = (legacyId: string, refresh = false) => loadDraft(() => client.purchaseDraft(legacyId, refresh));

  async function confirmPublish() {
    if (!canPublish.value) return;
    step.value = "publishing";
    errorMessage.value = null;
    try {
      result.value = await client.publish({
        itemId: itemId.value,
        title: title.value.trim(),
        description: description.value.trim(),
        priceUsd: priceUsd.value,
        imageUrls: selectedImageUrls.value,
        queueForFacebook: queueForFacebook.value,
      });
      step.value = "done";
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : String(err);
      // Vuelve al borrador (no a error): lo que se editó no se pierde y se
      // puede reintentar sin volver a pegar el link.
      step.value = "draft";
    }
  }

  return {
    step,
    errorMessage,
    result,
    itemId,
    originalTitle,
    ebayUrl,
    title,
    description,
    priceUsd,
    images,
    queueForFacebook,
    selectedImageUrls,
    canPublish,
    reset,
    resolveUrl,
    resolvePurchase,
    confirmPublish,
  };
}
