/** Lo que devuelve resolver un link de eBay: detalle + copy ya sugerido por el backend. */
export interface ResolvedListing {
  itemId: string;
  url: string;
  title: string;
  suggestedTitle: string;
  suggestedDescription: string;
  priceUsd: number | null;
  condition: string | null;
  images: string[];
  cpuMatch: string | null;
}

export interface PublishResult {
  productId: string;
  slug: string;
}

/** Puerto: resolver un link y publicar el borrador confirmado. */
export interface PublishClient {
  resolve(url: string): Promise<ResolvedListing>;
  publish(input: {
    itemId: string;
    title: string;
    description: string;
    priceUsd: number;
    imageUrls: string[];
    queueForFacebook: boolean;
  }): Promise<PublishResult>;
}

export interface PublicationStatus {
  itemId: string;
  storeSlug: string | null;
  storePublishedAt: string | null;
  facebookStatus: "none" | "queued" | "posted" | "failed" | "skipped";
}

/** Puerto: qué ya se publicó, para no repetir y para la insignia en las tarjetas. */
export interface PublicationStatusRepository {
  listAll(): Promise<PublicationStatus[]>;
}
