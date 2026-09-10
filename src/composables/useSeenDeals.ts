import { onMounted, ref, watch } from "vue";

const STORAGE_KEY = "revolt-desk-seen";

/**
 * Qué ofertas ya revisaste. Se guarda en este navegador (no en el backend) a
 * propósito: la clave anon del dashboard es de solo lectura, y abrir una vía de
 * escritura pública para esto no vale la pena. La contra es que el estado no se
 * comparte entre dispositivos.
 */
export function useSeenDeals() {
  const seenIds = ref<Set<string>>(new Set());

  onMounted(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) seenIds.value = new Set(JSON.parse(stored) as string[]);
    } catch {
      // Storage bloqueado o dato corrupto: se arranca sin nada visto.
    }
  });

  watch(
    seenIds,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...value]));
      } catch {
        // Sigue funcionando en la sesión, solo no se recuerda.
      }
    },
    { deep: true },
  );

  function isSeen(itemId: string): boolean {
    return seenIds.value.has(itemId);
  }

  function markSeen(itemId: string) {
    seenIds.value.add(itemId);
  }

  function toggleSeen(itemId: string) {
    if (seenIds.value.has(itemId)) seenIds.value.delete(itemId);
    else seenIds.value.add(itemId);
  }

  function markAllSeen(itemIds: string[]) {
    for (const id of itemIds) seenIds.value.add(id);
  }

  function clearSeen() {
    seenIds.value.clear();
  }

  return { seenIds, isSeen, markSeen, toggleSeen, markAllSeen, clearSeen };
}
