import type { Deal, DealsRepository } from "../domain/types";

interface DealRow {
  item_id: string;
  title: string;
  price: number | null;
  currency: string;
  condition: string | null;
  cpu_match: string | null;
  score: number | null;
  is_great_deal: boolean;
  has_description: boolean;
  has_battery_info: boolean;
  battery_grade: string | null;
  is_auction: boolean;
  has_best_offer: boolean;
  end_date: string | null;
  seller_username: string | null;
  seller_feedback_score: number | null;
  seller_feedback_percentage: number | null;
  url: string;
  image_url: string | null;
  first_seen_at: string;
}

function toDeal(row: DealRow): Deal {
  return {
    itemId: row.item_id,
    title: row.title,
    price: row.price,
    currency: row.currency,
    condition: row.condition,
    cpuMatch: row.cpu_match,
    score: row.score,
    isGreatDeal: row.is_great_deal,
    hasDescription: row.has_description,
    hasBatteryInfo: row.has_battery_info,
    batteryGrade: row.battery_grade,
    isAuction: row.is_auction,
    hasBestOffer: row.has_best_offer,
    endDate: row.end_date,
    sellerUsername: row.seller_username,
    sellerFeedbackScore: row.seller_feedback_score,
    sellerFeedbackPercentage: row.seller_feedback_percentage,
    url: row.url,
    imageUrl: row.image_url,
    firstSeenAt: row.first_seen_at,
  };
}

/**
 * Lee la vista `deals_public` del backend (deal-hunter-backend) directo por REST.
 * El anon key es seguro de exponer acá: esa vista es de solo lectura y solo
 * expone ofertas ya calificadas, sin columnas sensibles.
 */
export class SupabaseDealsRepository implements DealsRepository {
  constructor(
    private readonly supabaseUrl: string,
    private readonly anonKey: string,
  ) {}

  async listDeals(): Promise<Deal[]> {
    const url = `${this.supabaseUrl}/rest/v1/deals_public?select=*&order=score.desc.nullslast,first_seen_at.desc`;
    const res = await fetch(url, {
      headers: {
        apikey: this.anonKey,
        Authorization: `Bearer ${this.anonKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`No se pudo leer deals_public (${res.status}): ${await res.text()}`);
    }

    const rows = (await res.json()) as DealRow[];
    return rows.map(toDeal);
  }
}
