import type { PublicationStatus, PublicationStatusRepository } from "../domain/publish-types";

interface PublicationRow {
  item_id: string;
  store_slug: string | null;
  store_published_at: string | null;
  facebook_status: PublicationStatus["facebookStatus"];
}

/** Lee `publications_public` (solo lectura, sin costos ni fotos) por REST directo, igual que SupabaseDealsRepository. */
export class SupabasePublicationStatusRepository implements PublicationStatusRepository {
  constructor(
    private readonly supabaseUrl: string,
    private readonly anonKey: string,
  ) {}

  async listAll(): Promise<PublicationStatus[]> {
    const res = await fetch(`${this.supabaseUrl}/rest/v1/publications_public?select=*`, {
      headers: { apikey: this.anonKey, Authorization: `Bearer ${this.anonKey}` },
    });
    if (!res.ok) throw new Error(`No se pudo leer publications_public (${res.status}): ${await res.text()}`);

    const rows = (await res.json()) as PublicationRow[];
    return rows.map((row) => ({
      itemId: row.item_id,
      storeSlug: row.store_slug,
      storePublishedAt: row.store_published_at,
      facebookStatus: row.facebook_status,
    }));
  }
}
