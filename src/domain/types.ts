// Puerto del dominio: la UI depende de esta interfaz, no de Supabase directamente
// (Dependency Inversion) — así se puede cambiar de backend o mockear en tests
// sin tocar componentes ni composables.

export interface Deal {
  itemId: string;
  title: string;
  price: number | null;
  currency: string;
  condition: string | null;
  cpuMatch: string | null;
  score: number | null;
  isGreatDeal: boolean;
  hasDescription: boolean;
  hasBatteryInfo: boolean;
  batteryGrade: string | null;
  isAuction: boolean;
  url: string;
  imageUrl: string | null;
  firstSeenAt: string;
}

export type DealSortBy = "score" | "price" | "date";

export interface DealsRepository {
  listDeals(): Promise<Deal[]>;
}

// Mismo criterio que el backend (domain/hardware-signals.ts -> needsBatteryGradeReview):
// no sabemos la escala de cada vendedor, A/B se asumen aceptables, C/D/F se marcan para revisar.
const GRADES_TO_REVIEW = new Set(["C", "D", "F"]);

export function needsBatteryGradeReview(grade: string | null): boolean {
  return grade !== null && GRADES_TO_REVIEW.has(grade);
}
