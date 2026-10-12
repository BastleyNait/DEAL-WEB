import { computed, onMounted, onUnmounted, ref, watch } from "vue";
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
  // Arranca en compra directa: las subastas quedan en segundo plano porque su
  // precio final es desconocido.
  const format = ref<DealFormat>("buyNow");
  const sortBy = ref<DealSortBy>("score");
  const query = ref("");

  // Al pasar a subastas, lo que importa es qué cierra antes — ordenar por
  // puntaje dejaría arriba cosas que terminan en una semana. Solo se cambia si
  // el orden estaba en el valor por defecto: una elección explícita se respeta.
  watch(format, (next, previous) => {
    if (next === "auction" && sortBy.value === "score") sortBy.value = "ending";
    else if (previous === "auction" && next === "buyNow" && sortBy.value === "ending") sortBy.value = "score";
  });

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

    // Una subasta que ya cerró no se puede pujar: no es una oferta, es historia.
    if (format.value === "auction") {
      list = list.filter((d) => !d.endDate || new Date(d.endDate).getTime() > Date.now());
    }

    if (view.value === "unseen") list = list.filter((d) => !isSeen(d.itemId));
    if (view.value === "special") list = list.filter((d) => d.specialLabel);
    if (view.value === "great") list = list.filter((d) => d.isGreatDeal);
    if (view.value === "review") list = list.filter(needsReview);
    list = list.filter((d) => dealFormat(d) === format.value);

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
      // Puntaje: de mayor a menor, sin agrupar. Antes las urgentes, las 2 en 1
      // y las CPUs prioritarias iban primero y dentro de cada grupo por
      // puntaje, así que una de 64 podía quedar arriba de una de 80 y el orden
      // "por puntaje" no lo era. Esas marcas se ven en cada fila y las 2 en 1
      // tienen su propia pestaña.
      return (b.score ?? 0) - (a.score ?? 0);
    });
  });

  const counts = computed(() => {
    const buyNow = deals.value.filter((d) => dealFormat(d) === "buyNow");
    // Mismo criterio que la lista: las cerradas no cuentan, si no el conmutador
    // promete subastas que después no aparecen.
    const auction = deals.value.filter(
      (d) => dealFormat(d) === "auction" && (!d.endDate || new Date(d.endDate).getTime() > Date.now()),
    );
    // Los contadores de vista cuentan dentro del formato activo: decir
    // "Sin ver 234" cuando en pantalla hay 160 sería mentir.
    const scoped = format.value === "auction" ? auction : buyNow;

    return {
      all: scoped.length,
      unseen: scoped.filter((d) => !isSeen(d.itemId)).length,
      special: scoped.filter((d) => d.specialLabel).length,
      great: scoped.filter((d) => d.isGreatDeal).length,
      review: scoped.filter(needsReview).length,
      buyNow: buyNow.length,
      auction: auction.length,
      cheapest: scoped.reduce<number | null>(
        (min, d) => (d.price != null && (min === null || d.price < min) ? d.price : min),
        null,
      ),
    };
  });

  onMounted(() => {
    load();
    intervalId = setInterval(load, AUTO_REFRESH_MS);
  });

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
  });

  return { deals, loading, error, lastUpdated, view, format, sortBy, query, visibleDeals, counts, reload: load };
}
