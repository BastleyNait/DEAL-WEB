import { computed, onMounted, onUnmounted, ref } from "vue";
import type { Deal, DealFormat, DealsRepository, DealSortBy, DealView } from "../domain/types";
import { dealFormat, needsReview } from "../domain/types";

const AUTO_REFRESH_MS = 60_000;

/**
 * Toda la lógica de "traer ofertas, filtrar, ordenar, autorefrescar" vive acá,
 * separada de los componentes de UI. Recibe el repositorio por parámetro
 * (Dependency Inversion) en vez de importar Supabase directo, así se puede
 * testear con un repositorio fake.
 */
export function useDeals(repository: DealsRepository, isSeen: (itemId: string) => boolean) {
  const deals = ref<Deal[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const lastUpdated = ref<Date | null>(null);

  // Arranca en "sin ver": lo primero que querés es lo que todavía no miraste.
  const view = ref<DealView>("unseen");
  const format = ref<DealFormat>("any");
  const sortBy = ref<DealSortBy>("score");
  const query = ref("");

  let intervalId: ReturnType<typeof setInterval> | undefined;

  async function load() {
    try {
      deals.value = await repository.listDeals();
      error.value = null;
      lastUpdated.value = new Date();
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
  }

  const visibleDeals = computed(() => {
    let list = deals.value;

    if (view.value === "unseen") list = list.filter((d) => !isSeen(d.itemId));
    if (view.value === "great") list = list.filter((d) => d.isGreatDeal);
    if (view.value === "review") list = list.filter(needsReview);
    if (format.value !== "any") list = list.filter((d) => dealFormat(d) === format.value);

    const term = query.value.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (d) => d.title.toLowerCase().includes(term) || (d.cpuMatch ?? "").toLowerCase().includes(term),
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy.value === "price") return (a.price ?? Infinity) - (b.price ?? Infinity);
      if (sortBy.value === "date") return new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime();
      if (sortBy.value === "ending") {
        // Las subastas por cerrar primero; lo que no tiene cierre va al final.
        const aEnd = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        return aEnd - bEnd;
      }
      // Orden por defecto: las CPUs prioritarias arriba de todo, y dentro de
      // cada grupo por puntaje. Los otros órdenes se respetan tal cual: si
      // pediste por precio, querés ver el precio, no la prioridad.
      if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
      return (b.score ?? 0) - (a.score ?? 0);
    });
  });

  const counts = computed(() => ({
    all: deals.value.length,
    unseen: deals.value.filter((d) => !isSeen(d.itemId)).length,
    great: deals.value.filter((d) => d.isGreatDeal).length,
    review: deals.value.filter(needsReview).length,
    auction: deals.value.filter((d) => dealFormat(d) === "auction").length,
    offer: deals.value.filter((d) => dealFormat(d) === "offer").length,
    fixed: deals.value.filter((d) => dealFormat(d) === "fixed").length,
    cheapest: deals.value.reduce<number | null>(
      (min, d) => (d.price != null && (min === null || d.price < min) ? d.price : min),
      null,
    ),
  }));

  onMounted(() => {
    load();
    intervalId = setInterval(load, AUTO_REFRESH_MS);
  });

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
  });

  return { deals, loading, error, lastUpdated, view, format, sortBy, query, visibleDeals, counts, reload: load };
}
