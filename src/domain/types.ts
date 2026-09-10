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
  url: string;
  imageUrl: string | null;
  firstSeenAt: string;
}

export type DealSortBy = "score" | "price" | "date";

export interface DealsRepository {
  listDeals(): Promise<Deal[]>;
}
