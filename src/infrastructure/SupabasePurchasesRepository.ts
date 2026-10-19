import type { Purchase, PurchasesRepository } from "../domain/publish-types";

interface PurchaseRow {
  legacy_id: string;
  item_id: string;
  url: string;
  source: Purchase["source"];
  bought_by: string | null;
  bought_at: string;
  has_draft: boolean;
  title: string | null;
  price: number | string | null;
  image_url: string | null;
  store_slug: string | null;
}

/**
 * Lee `purchases_public` (la cola de compradas por publicar) por REST directo.
 * Solo lectura: no toca eBay, así que listar la cola es instantáneo; el texto
 * de cada una se pide aparte, cuando se abre (ver PublishClient.purchaseDraft).
 */
export class SupabasePurchasesRepository implements PurchasesRepository {
  constructor(
    private readonly supabaseUrl: string,
    private readonly anonKey: string,
  ) {}

  async listAll(): Promise<Purchase[]> {
    const res = await fetch(`${this.supabaseUrl}/rest/v1/purchases_public?select=*&order=bought_at.desc`, {
      headers: { apikey: this.anonKey, Authorization: `Bearer ${this.anonKey}` },
    });
    if (!res.ok) throw new Error(`No se pudo leer la cola de compras (${res.status}): ${await res.text()}`);
    const rows = (await res.json()) as PurchaseRow[];
    return rows.map((r) => ({
      legacyId: r.legacy_id,
      itemId: r.item_id,
      url: r.url,
      source: r.source,
      boughtBy: r.bought_by,
      boughtAt: r.bought_at,
      hasDraft: r.has_draft,
      title: r.title,
      price: r.price == null ? null : Number(r.price),
      imageUrl: r.image_url,
      storeSlug: r.store_slug,
    }));
  }
}
