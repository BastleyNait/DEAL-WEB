import type { Deal, DealDetail, DealsRepository, ListingAspect } from "../domain/types";

// Tope de filas por respuesta de la API REST de Supabase (max_rows).
const PAGE_SIZE = 1000;

interface DetailRow {
  item_id: string;
  seller_description: string | null;
  seller_description_html: string | null;
  aspects: ListingAspect[] | null;
  additional_images: string[] | null;
}

interface DealRow {
  item_id: string;
  title: string;
  price: number | null;
  currency: string;
  condition: string | null;
  cpu_match: string | null;
  score: number | null;
  is_great_deal: boolean;
  is_priority: boolean;
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
  bid_count: number | null;
  price_checked_at: string | null;
  special_label: string | null;
  special_demoted: boolean | null;
  is_urgent: boolean | null;
  gpu: string | null;
  gpu_design: boolean | null;
  gpu_special: boolean | null;
  cosmetic_note: string | null;
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
    isPriority: row.is_priority,
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
    bidCount: row.bid_count,
    priceCheckedAt: row.price_checked_at,
    specialLabel: row.special_label ?? null,
    specialDemoted: row.special_demoted ?? false,
    isUrgent: row.is_urgent ?? false,
    gpu: row.gpu ?? null,
    isGpuDesign: row.gpu_design ?? false,
    isGpuSpecial: row.gpu_special ?? false,
    cosmeticNote: row.cosmetic_note ?? null,
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

  /**
   * De a páginas: la API REST de Supabase corta cada respuesta en 1.000
   * filas sin avisar, y deals_public ya pasó ese número (1.714 al momento de
   * este cambio). Con una sola consulta, el dashboard descartaba en silencio
   * todo lo de menor puntaje — incluidas ofertas especiales, que se muestran
   * aunque tengan puntaje bajo. El item_id al final del orden hace que el
   * corte entre páginas sea estable (sin repetidos ni huecos).
   */
  async listDeals(): Promise<Deal[]> {
    const rows: DealRow[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const url =
        `${this.supabaseUrl}/rest/v1/deals_public?select=*` +
        `&order=score.desc.nullslast,first_seen_at.desc,item_id.asc&limit=${PAGE_SIZE}&offset=${offset}`;
      const res = await fetch(url, {
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${this.anonKey}`,
        },
      });

      if (!res.ok) {
        throw new Error(`No se pudo leer deals_public (${res.status}): ${await res.text()}`);
      }

      const page = (await res.json()) as DealRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows.map(toDeal);
  }

  async getDetail(itemId: string): Promise<DealDetail> {
    const url = `${this.supabaseUrl}/rest/v1/deal_details_public?item_id=eq.${encodeURIComponent(itemId)}&select=*`;
    const res = await fetch(url, {
      headers: {
        apikey: this.anonKey,
        Authorization: `Bearer ${this.anonKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`No se pudo leer el detalle (${res.status}): ${await res.text()}`);
    }

    const rows = (await res.json()) as DetailRow[];
    const row = rows[0];
    return {
      itemId,
      sellerDescription: row?.seller_description ?? null,
      sellerDescriptionHtml: row?.seller_description_html ?? null,
      aspects: row?.aspects ?? [],
      additionalImages: row?.additional_images ?? [],
    };
  }
}
