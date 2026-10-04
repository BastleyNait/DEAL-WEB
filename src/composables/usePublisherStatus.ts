import { onScopeDispose, ref } from "vue";
import type { PublisherStatus, PublisherStatusRepository } from "../domain/publish-types";

/**
 * Estado del publicador de tu PC (apagado / libre / trabajando / esperando tu
 * click). Se consulta cada 10 s, igual que el latido del publicador: preguntar
 * más seguido no da información nueva. `refresh` sirve para pedirlo ya (por
 * ejemplo mientras el panel está abierto).
 */
export function usePublisherStatus(repository: PublisherStatusRepository) {
  const status = ref<PublisherStatus>({ state: "offline", currentTitle: null });
  // false hasta la primera lectura, para no mostrar "apagado" antes de saberlo.
  const loaded = ref(false);

  async function refresh() {
    try {
      status.value = await repository.read();
      loaded.value = true;
    } catch {
      // Un fallo de red no debe pintar "apagado": se queda con lo último que se supo.
    }
  }

  refresh();
  const timer = setInterval(refresh, 10_000);
  onScopeDispose(() => clearInterval(timer));

  return { status, loaded, refresh };
}
