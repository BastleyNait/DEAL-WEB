import { computed, ref } from "vue";
import type { Purchase, PurchasesRepository } from "../domain/publish-types";

/**
 * La cola de compradas por publicar. `pending` son las que todavía no están en
 * la tienda: esas se muestran en Publicar y cuentan en el botón del encabezado.
 */
export function usePurchases(repository: PurchasesRepository) {
  const purchases = ref<Purchase[]>([]);
  const error = ref<string | null>(null);

  async function reload() {
    try {
      purchases.value = await repository.listAll();
      error.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    }
  }

  const pending = computed(() => purchases.value.filter((p) => !p.storeSlug));

  reload();
  return { purchases, pending, error, reload };
}
