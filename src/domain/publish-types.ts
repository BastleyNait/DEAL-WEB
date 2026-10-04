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
  /**
   * Pasa a la cola de Facebook publicaciones que ya están en la tienda. Con ids
   * encola esas (ninguna / fallida / salteada); sin ids solo reintenta las
   * fallidas. Devuelve cuántas movió.
   */
  queueFacebook(itemIds?: string[]): Promise<number>;
}

export type FacebookStatus = "none" | "queued" | "posted" | "failed" | "skipped";

export interface PublicationStatus {
  itemId: string;
  title: string | null;
  storeSlug: string | null;
  storePublishedAt: string | null;
  facebookStatus: FacebookStatus;
}

/** Puerto: qué ya se publicó, para no repetir y para la insignia en las tarjetas. */
export interface PublicationStatusRepository {
  listAll(): Promise<PublicationStatus[]>;
}

/** Lo que hace el publicador local. "offline" no lo escribe él: se deduce de que dejó de latir. */
export type PublisherState = "offline" | "idle" | "working" | "waiting_confirm";

export interface PublisherStatus {
  state: PublisherState;
  currentTitle: string | null;
}

/** Puerto: ¿está encendido el publicador de tu PC y qué está haciendo? */
export interface PublisherStatusRepository {
  read(): Promise<PublisherStatus>;
}
