import type { PublishClient, PublishResult, ResolvedListing, StoreLaptop } from "../domain/publish-types";

/**
 * Llama a la Edge Function publish-deal (no a una vista REST: publicar tiene
 * efectos — baja fotos, escribe en la tienda — así que necesita un endpoint,
 * no una tabla). Se autentica con un token propio (x-publish-token), separado
 * del anon key de Supabase: ese key solo da lectura a las vistas públicas, y
 * publicar es una acción, no una lectura.
 */
export class SupabasePublishClient implements PublishClient {
  constructor(
    private readonly supabaseUrl: string,
    private readonly publishToken: string,
  ) {}

  async resolve(url: string): Promise<ResolvedListing> {
    const json = await this.call({ action: "resolve", url });
    return json.data as ResolvedListing;
  }

  async publish(input: {
    itemId: string;
    title: string;
    description: string;
    priceUsd: number;
    imageUrls: string[];
    queueForFacebook: boolean;
  }): Promise<PublishResult> {
    const json = await this.call({ action: "publish", ...input });
    return json.data as PublishResult;
  }

  async queueFacebook(itemIds?: string[]): Promise<number> {
    const json = await this.call({ action: "facebook-queue", ...(itemIds ? { itemIds } : {}) });
    return (json.data as { queued: number }).queued;
  }

  async addPurchase(url: string): Promise<void> {
    await this.call({ action: "purchase-add", url });
  }

  async dismissPurchase(legacyId: string): Promise<void> {
    await this.call({ action: "purchase-dismiss", legacyId });
  }

  async purchaseDraft(legacyId: string, refresh = false): Promise<ResolvedListing> {
    const json = await this.call({ action: "purchase-draft", legacyId, refresh });
    return json.data as ResolvedListing;
  }

  async storeCatalog(): Promise<StoreLaptop[]> {
    const json = await this.call({ action: "store-catalog" });
    return json.data as StoreLaptop[];
  }

  async queueStoreProduct(productId: string): Promise<void> {
    await this.call({ action: "facebook-queue-store", productId });
  }

  private async call(body: Record<string, unknown>): Promise<{ data: unknown }> {
    if (!this.publishToken) {
      throw new Error("Falta VITE_PUBLISH_TOKEN en el build del frontend — no se puede publicar.");
    }
    const res = await fetch(`${this.supabaseUrl}/functions/v1/publish-deal`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-publish-token": this.publishToken },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((json as { error?: string }).error ?? `Error ${res.status} publicando.`);
    }
    return json as { data: unknown };
  }
}
