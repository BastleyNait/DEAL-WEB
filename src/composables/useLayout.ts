import { onMounted, ref, watch } from "vue";
import type { DealLayout } from "../domain/types";

const LAYOUT_KEY = "revolt-desk-layout";
const COLUMNS_KEY = "revolt-desk-columns";

export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 8;

/**
 * Preferencias de vista (lista densa o grilla, y cuántas tarjetas por fila),
 * recordadas entre sesiones. Se persisten observando las refs, así da igual
 * quién las cambie: el v-model de los controles o cualquier otro lugar.
 */
export function useLayout() {
  const layout = ref<DealLayout>("list");
  const columns = ref(4);

  onMounted(() => {
    try {
      const storedLayout = localStorage.getItem(LAYOUT_KEY);
      if (storedLayout === "list" || storedLayout === "grid") layout.value = storedLayout;

      const storedColumns = Number(localStorage.getItem(COLUMNS_KEY));
      if (storedColumns >= MIN_COLUMNS && storedColumns <= MAX_COLUMNS) columns.value = storedColumns;
    } catch {
      // Storage bloqueado: quedan los valores por defecto.
    }
  });

  watch([layout, columns], ([nextLayout, nextColumns]) => {
    try {
      localStorage.setItem(LAYOUT_KEY, nextLayout);
      localStorage.setItem(COLUMNS_KEY, String(nextColumns));
    } catch {
      // La vista sigue funcionando, solo no se recuerda.
    }
  });

  return { layout, columns };
}
