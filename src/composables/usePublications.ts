import { ref } from "vue";
import type { PublicationStatus, PublicationStatusRepository } from "../domain/publish-types";

/**
 * Estado de qué ya se publicó, para la insignia en las tarjetas y para que el
 * panel de publicación sepa si ya existe un producto para este itemId. Se
 * relee después de cada publish() exitoso (ver usePublish), no hace falta
 * autorefresco propio: es una tabla que solo cambia cuando vos publicás algo.
 */
export function usePublications(repository: PublicationStatusRepository) {
  const byItemId = ref(new Map<string, PublicationStatus>());

  async function reload() {
    try {
      const rows = await repository.listAll();
      byItemId.value = new Map(rows.map((r) => [r.itemId, r]));
    } catch {
      // Silencioso a propósito: es una insignia informativa, no bloquea nada
      // si falla — el panel de publicación igual funciona sin ella.
    }
  }

  reload();

  return { byItemId, reload };
}
