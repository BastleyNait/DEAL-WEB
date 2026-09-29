// Puerto del dominio: la UI depende de esta interfaz, no de Supabase directamente
// (Dependency Inversion) — así se puede cambiar de backend o mockear en tests
// sin tocar componentes ni composables.

export interface ListingAspect {
  name: string;
  value: string;
}

export interface Deal {
  itemId: string;
  title: string;
  price: number | null;
  currency: string;
  condition: string | null;
  cpuMatch: string | null;
  score: number | null;
  isGreatDeal: boolean;
  isPriority: boolean;
  hasDescription: boolean;
  hasBatteryInfo: boolean;
  batteryGrade: string | null;
  isAuction: boolean;
  hasBestOffer: boolean;
  endDate: string | null;
  sellerUsername: string | null;
  sellerFeedbackScore: number | null;
  sellerFeedbackPercentage: number | null;
  url: string;
  imageUrl: string | null;
  firstSeenAt: string;
  /** Pujas de la subasta. Null en compra directa o si todavía no se consultó. */
  bidCount: number | null;
  /**
   * Última vez que el backend confirmó con eBay el precio y que sigue a la
   * venta. Lo vendido ya no llega: la vista lo filtra.
   */
  priceCheckedAt: string | null;
  /**
   * Tipo de oferta especial que matcheó, hoy "2 en 1" (laptop convertible), o
   * null. Se avisan aunque puntúen bajo, y van primero en el orden.
   */
  specialLabel: string | null;
  /**
   * true si es 2 en 1 pero de prioridad baja (Dell: suelen llegar rayadas o
   * rotas). Se ven en su pestaña, pero sin franja violeta y al final del orden.
   */
  specialDemoted: boolean;
}

/** 2 en 1 que sí encabeza: los de prioridad baja no cuentan. */
export function isTopSpecial(deal: Pick<Deal, "specialLabel" | "specialDemoted">): boolean {
  return Boolean(deal.specialLabel) && !deal.specialDemoted;
}

export type DealSortBy = "score" | "price" | "date" | "ending";

export type DealView = "unseen" | "all" | "special" | "great" | "review";

/** Lista densa para escanear muchas, grilla para comparar el estado visual. */
export type DealLayout = "list" | "grid";

/**
 * Compra directa (precio fijo, con o sin "hacer oferta") o subasta. Van
 * separadas porque son dos decisiones distintas: en una el precio es el que
 * ves, en la otra es una puja que todavía puede subir. Precio fijo y "acepta
 * oferta" van juntos: en ambos se compra hoy a un precio conocido, la oferta
 * solo lo puede bajar.
 */
export type DealFormat = "buyNow" | "auction";

export function dealFormat(deal: Deal): DealFormat {
  return deal.isAuction ? "auction" : "buyNow";
}

/**
 * Lo pesado de una publicación (descripción con formato, ficha, fotos). Va
 * aparte del listado y se pide recién al abrir el detalle: con ~300 ofertas,
 * traer esto en cada refresco serían varios MB.
 */
export interface DealDetail {
  itemId: string;
  sellerDescription: string | null;
  sellerDescriptionHtml: string | null;
  aspects: ListingAspect[];
  additionalImages: string[];
}

export interface DealsRepository {
  listDeals(): Promise<Deal[]>;
  getDetail(itemId: string): Promise<DealDetail>;
}

/** Puerto: qué ofertas ya se revisaron, compartido entre dispositivos. */
export interface SeenRepository {
  listSeen(): Promise<string[]>;
  markSeen(itemId: string): Promise<void>;
  unmarkSeen(itemId: string): Promise<void>;
}

// Mismo criterio que el backend (domain/hardware-signals.ts -> needsBatteryGradeReview):
// no sabemos la escala de cada vendedor, A/B se asumen aceptables, C/D/F se marcan para revisar.
const GRADES_TO_REVIEW = new Set(["C", "D", "F"]);

export function needsBatteryGradeReview(grade: string | null): boolean {
  return grade !== null && GRADES_TO_REVIEW.has(grade);
}

/** Motivos por los que conviene mirar la publicación antes de comprar. */
export function reviewFlags(deal: Deal): string[] {
  const flags: string[] = [];
  if (!deal.hasDescription) flags.push("sin descripción");
  if (!deal.hasBatteryInfo) flags.push("sin dato de batería");
  if (needsBatteryGradeReview(deal.batteryGrade)) flags.push(`batería grado ${deal.batteryGrade}`);
  return flags;
}

export function needsReview(deal: Deal): boolean {
  return reviewFlags(deal).length > 0;
}
