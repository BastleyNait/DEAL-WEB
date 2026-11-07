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
  /** Agrega un link de eBay a la cola de compradas por publicar. */
  addPurchase(url: string): Promise<void>;
  /** Saca una compra de la cola (no la borra: queda el registro). */
  dismissPurchase(legacyId: string): Promise<void>;
  /**
   * Borrador de publicación de una compra de la cola. Se genera la primera vez
   * (lee eBay) y después sale del caché, salvo que se pida `refresh`.
   */
  purchaseDraft(legacyId: string, refresh?: boolean): Promise<ResolvedListing>;
  /** Todas las laptops que hay hoy en revolt-laptops.com (leídas en el momento, no un caché). */
  storeCatalog(): Promise<StoreLaptop[]>;
  /** Encola para Facebook una laptop de la tienda, haya pasado o no por la Mesa de compra. */
  queueStoreProduct(productId: string): Promise<void>;
}

/** Una laptop tal como está ahora en la tienda REVOLT. */
export interface StoreLaptop {
  productId: string;
  slug: string;
  name: string;
  brand: string | null;
  processor: string | null;
  ram: string | null;
  storage: string | null;
  price: number;
  currency: string;
  image: string | null;
  photos: number;
  stock: number;
  /** false = borrador: todavía no se ve en la tienda. */
  isActive: boolean;
  inTransit: boolean;
}

/** Una laptop comprada que todavía hay que publicar (vista purchases_public). */
export interface Purchase {
  legacyId: string;
  itemId: string;
  url: string;
  /** "telegram" si se marcó con "🛒 La compro"; "manual" si se agregó el link. */
  source: "telegram" | "manual";
  boughtBy: string | null;
  boughtAt: string;
  hasDraft: boolean;
  title: string | null;
  price: number | null;
  imageUrl: string | null;
  /** Ya está en la tienda. */
  storeSlug: string | null;
}

export interface PurchasesRepository {
  listAll(): Promise<Purchase[]>;
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
