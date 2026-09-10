import { onMounted, ref } from "vue";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "revolt-desk-theme";

/**
 * Sin elección explícita se respeta el tema del sistema (no se estampa nada en
 * el <html>, así manda prefers-color-scheme). Al elegir, se estampa y se
 * recuerda.
 */
export function useTheme() {
  const theme = ref<Theme>("system");

  function apply(value: Theme) {
    theme.value = value;
    const root = document.documentElement;
    if (value === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Modo privado o storage bloqueado: el tema sigue funcionando, solo no se recuerda.
    }
  }

  function toggle() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = theme.value === "system" ? (prefersDark ? "dark" : "light") : theme.value;
    apply(current === "dark" ? "light" : "dark");
  }

  onMounted(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (stored === "light" || stored === "dark") apply(stored);
  });

  return { theme, toggle };
}
