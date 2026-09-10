import { onMounted, ref, watch } from "vue";
import type { DealLayout } from "../domain/types";

const STORAGE_KEY = "revolt-desk-layout";

/**
 * Preferencia de vista (lista densa o grilla), recordada entre sesiones.
 * Se persiste observando la ref, así da igual quién la cambie: el v-model del
 * conmutador o cualquier otro lugar.
 */
export function useLayout() {
  const layout = ref<DealLayout>("list");

  onMounted(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "list" || stored === "grid") layout.value = stored;
    } catch {
      // Storage bloqueado: queda la lista por defecto.
    }
  });

  watch(layout, (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // La vista sigue funcionando, solo no se recuerda.
    }
  });

  return { layout };
}
