import { computed, onMounted, onUnmounted, ref } from "vue";
import type { Deal, DealsRepository, DealSortBy } from "../domain/types";
import { needsBatteryGradeReview } from "../domain/types";

const AUTO_REFRESH_MS = 60_000;

/**
 * Toda la lógica de "traer ofertas, filtrar, ordenar, autorefrescar" vive acá,
 * separada de los componentes de UI. Recibe el repositorio por parámetro
 * (Dependency Inversion) en vez de importar Supabase directo, así se puede
 * testear con un repositorio fake.
 */
export function useDeals(repository: DealsRepository) {
  const deals = ref<Deal[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const lastUpdated = ref<Date | null>(null);

  const onlyGreatDeals = ref(false);
  const onlyNeedsReview = ref(false);
  const sortBy = ref<DealSortBy>("score");

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
    if (onlyGreatDeals.value) list = list.filter((d) => d.isGreatDeal);
    if (onlyNeedsReview.value) {
      list = list.filter((d) => !d.hasDescription || !d.hasBatteryInfo || needsBatteryGradeReview(d.batteryGrade));
    }

    return [...list].sort((a, b) => {
      if (sortBy.value === "price") return (a.price ?? Infinity) - (b.price ?? Infinity);
      if (sortBy.value === "date") return new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime();
      return (b.score ?? 0) - (a.score ?? 0);
    });
  });

  const stats = computed(() => {
    const total = deals.value.length;
    const great = deals.value.filter((d) => d.isGreatDeal).length;
    const prices = deals.value.map((d) => d.price ?? 0).filter((p) => p > 0);
    const avgPrice = prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : null;
    return { total, great, avgPrice };
  });

  onMounted(() => {
    load();
    intervalId = setInterval(load, AUTO_REFRESH_MS);
  });

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
  });

  return { loading, error, lastUpdated, onlyGreatDeals, onlyNeedsReview, sortBy, visibleDeals, stats, reload: load };
}
