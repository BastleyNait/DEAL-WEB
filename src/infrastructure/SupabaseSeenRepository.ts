import type { SeenRepository } from "../domain/types";

// Tope de filas por respuesta de la API REST de Supabase (max_rows).
const PAGE_SIZE = 1000;

/**
 * Estado de "visto" en la tabla `deal_views` del backend, para que se comparta
 * entre dispositivos. Es la única tabla donde la clave pública puede escribir:
 * las ofertas y la config no son ni legibles desde el navegador.
 */
export class SupabaseSeenRepository implements SeenRepository {
  constructor(
    private readonly supabaseUrl: string,
    private readonly anonKey: string,
  ) {}

  private get headers() {
    return {
      apikey: this.anonKey,
      Authorization: `Bearer ${this.anonKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * De a páginas por el mismo tope de 1.000 filas de la API REST que ya
   * mordió a deals_public: pasado ese número, lo marcado como visto de más
   * volvería a aparecer como "sin ver" sin que nadie lo desmarque.
   */
  async listSeen(): Promise<string[]> {
    const ids: string[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const url = `${this.supabaseUrl}/rest/v1/deal_views?select=item_id&order=item_id.asc&limit=${PAGE_SIZE}&offset=${offset}`;
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) throw new Error(`No se pudo leer el estado de visto (${res.status})`);
      const rows = (await res.json()) as { item_id: string }[];
      ids.push(...rows.map((r) => r.item_id));
      if (rows.length < PAGE_SIZE) break;
    }
    return ids;
  }

  async markSeen(itemId: string): Promise<void> {
    const res = await fetch(`${this.supabaseUrl}/rest/v1/deal_views`, {
      method: "POST",
      // Si ya estaba marcada, no es un error: se deja como está.
      headers: { ...this.headers, Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({ item_id: itemId }),
    });
    if (!res.ok) throw new Error(`No se pudo marcar como vista (${res.status})`);
  }

  async unmarkSeen(itemId: string): Promise<void> {
    const url = `${this.supabaseUrl}/rest/v1/deal_views?item_id=eq.${encodeURIComponent(itemId)}`;
    const res = await fetch(url, { method: "DELETE", headers: this.headers });
    if (!res.ok) throw new Error(`No se pudo desmarcar (${res.status})`);
  }
}
