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
  sellerDescription: string | null;
  aspects: ListingAspect[];
  additionalImages: string[];
  url: string;
  imageUrl: string | null;
  firstSeenAt: string;
}

export type DealSortBy = "score" | "price" | "date" | "ending";

export type DealView = "unseen" | "all" | "great" | "review";

/** Lista densa para escanear muchas, grilla para comparar el estado visual. */
export type DealLayout = "list" | "grid";

/** Cómo se compra: cada formato se negocia distinto, por eso se filtran aparte. */
export type DealFormat = "any" | "auction" | "offer" | "fixed";

export function dealFormat(deal: Deal): Exclude<DealFormat, "any"> {
  if (deal.isAuction) return "auction";
  if (deal.hasBestOffer) return "offer";
  return "fixed";
}

export interface DealsRepository {
  listDeals(): Promise<Deal[]>;
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
