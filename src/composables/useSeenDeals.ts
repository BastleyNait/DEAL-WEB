import { onMounted, onUnmounted, ref } from "vue";
import type { SeenRepository } from "../domain/types";

const REFRESH_MS = 60_000;

/**
 * Qué ofertas ya revisaste, compartido entre dispositivos a través del backend.
 * Las marcas se aplican de inmediato en pantalla y se guardan en segundo plano;
 * si la escritura falla, se revierte y se avisa, para que nunca quede algo
 * marcado en la pantalla pero no guardado.
 */
export function useSeenDeals(repository: SeenRepository) {
  const seenIds = ref<Set<string>>(new Set());
  const syncError = ref<string | null>(null);

  let intervalId: ReturnType<typeof setInterval> | undefined;

  async function reload() {
    try {
      seenIds.value = new Set(await repository.listSeen());
      syncError.value = null;
    } catch (err) {
      syncError.value = err instanceof Error ? err.message : String(err);
    }
  }

  function isSeen(itemId: string): boolean {
    return seenIds.value.has(itemId);
  }

  async function markSeen(itemId: string) {
    if (seenIds.value.has(itemId)) return;
    seenIds.value.add(itemId);
    try {
      await repository.markSeen(itemId);
      syncError.value = null;
    } catch (err) {
      seenIds.value.delete(itemId);
      syncError.value = err instanceof Error ? err.message : String(err);
    }
  }

  async function unmarkSeen(itemId: string) {
    if (!seenIds.value.has(itemId)) return;
    seenIds.value.delete(itemId);
    try {
      await repository.unmarkSeen(itemId);
      syncError.value = null;
    } catch (err) {
      seenIds.value.add(itemId);
      syncError.value = err instanceof Error ? err.message : String(err);
    }
  }

  function toggleSeen(itemId: string) {
    return seenIds.value.has(itemId) ? unmarkSeen(itemId) : markSeen(itemId);
  }

  onMounted(() => {
    reload();
    // Refresca para tomar lo que hayas marcado desde otro dispositivo.
    intervalId = setInterval(reload, REFRESH_MS);
  });

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
  });

  return { seenIds, syncError, isSeen, markSeen, unmarkSeen, toggleSeen, reload };
}
