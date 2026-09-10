import type { SeenRepository } from "../domain/types";

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

  async listSeen(): Promise<string[]> {
    const res = await fetch(`${this.supabaseUrl}/rest/v1/deal_views?select=item_id`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`No se pudo leer el estado de visto (${res.status})`);
    const rows = (await res.json()) as { item_id: string }[];
    return rows.map((r) => r.item_id);
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
