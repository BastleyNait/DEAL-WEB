import { onMounted, onUnmounted, ref } from "vue";

/**
 * Un único reloj compartido para todas las cuentas regresivas de subasta, en
 * vez de un timer por fila.
 */
export function useClock(intervalMs = 30_000) {
  const now = ref(Date.now());
  let id: ReturnType<typeof setInterval> | undefined;

  onMounted(() => {
    id = setInterval(() => (now.value = Date.now()), intervalMs);
  });
  onUnmounted(() => {
    if (id) clearInterval(id);
  });

  return now;
}
