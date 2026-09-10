// Los títulos de eBay traen las specs sueltas en texto. Extraerlas deja mostrar
// la fila como una ficha técnica escaneable en vez de un párrafo largo.
// Mismos patrones que usa el backend en domain/hardware-signals.ts.

const RAM_RE = /(\d{1,3})\s?gb\s*ram|ram\s*[:\-]?\s*(\d{1,3})\s?gb/i;
const STORAGE_TB_RE = /\b(\d)\s?tb\b/i;
const STORAGE_GB_RE = /(\d{3,4})\s?gb\s*(?:ssd|hdd|nvme|storage)?/i;
const SCREEN_RE = /\b(1[0-8](?:\.\d)?)\s*(?:"|in\b|inch|pulg)/i;

export function ramLabel(title: string): string | null {
  const m = title.match(RAM_RE);
  const gb = m ? Number(m[1] ?? m[2]) : 0;
  return gb > 0 ? `${gb}GB RAM` : null;
}

export function storageLabel(title: string): string | null {
  const tb = title.match(STORAGE_TB_RE);
  if (tb) return `${tb[1]}TB`;
  const gb = title.match(STORAGE_GB_RE);
  return gb ? `${gb[1]}GB` : null;
}

export function screenLabel(title: string): string | null {
  const m = title.match(SCREEN_RE);
  return m ? `${m[1]}"` : null;
}

/** Iniciales de la marca para la miniatura cuando la publicación no trae foto. */
export function brandInitials(title: string): string {
  const known = ["Dell", "HP", "Lenovo", "Acer", "Asus", "Microsoft", "MSI", "Samsung", "LG", "Toshiba", "Apple"];
  const found = known.find((brand) => new RegExp(`\\b${brand}\\b`, "i").test(title));
  if (found) return found.slice(0, 2).toUpperCase();
  return title.trim().slice(0, 2).toUpperCase();
}
