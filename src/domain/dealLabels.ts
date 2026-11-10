import type { Deal } from "./types";

/**
 * Nombres de las ofertas en el dashboard. Es la misma jerarquía que usa el
 * backend para Telegram (DEAL HUNTER: supabase/functions/_shared/domain/
 * deal-labels.ts): si se cambia un nombre o el orden, se cambia en los dos.
 *
 *   💰 OFERTA URGENTE > ⏰ SUBASTA > 🎮 GPU DEDICADA > 🔄 2 EN 1 > 🚨 OFERTAZA
 *
 * El encabezado (headline) es la etiqueta de más jerarquía; el resto son chips.
 * "CPU prioritaria" nunca encabeza: es un chip.
 */
export type DealLabelId = "urgent" | "auction" | "gpu" | "special" | "great" | "priority";

export interface DealLabel {
  id: DealLabelId;
  emoji: string;
  /** Nombre completo ("OFERTA URGENTE"), para el detalle. */
  name: string;
  /** Nombre corto para filas y tarjetas ("URGENTE"). */
  short: string;
  title: string;
}

const LABELS: Record<DealLabelId, DealLabel> = {
  urgent: {
    id: "urgent",
    emoji: "💰",
    name: "OFERTA URGENTE",
    short: "URGENTE",
    title: "16GB+ de RAM, SSD de 512GB+, CPU buscada y hasta $220",
  },
  auction: { id: "auction", emoji: "⏰", name: "SUBASTA", short: "SUBASTA", title: "Subasta: el precio es el actual, no el final" },
  gpu: {
    id: "gpu",
    emoji: "🎮",
    name: "GPU DEDICADA",
    short: "GPU",
    title: "Gráfica dedicada: AutoCAD, render y video. La de diseño es la que más margen deja",
  },
  special: { id: "special", emoji: "🔄", name: "OFERTA 2 EN 1", short: "2 EN 1", title: "Convertible: se usa como laptop y como tablet" },
  great: { id: "great", emoji: "🚨", name: "OFERTAZA", short: "OFERTAZA", title: "Puntaje de 80 o más" },
  priority: { id: "priority", emoji: "⭐", name: "CPU PRIORITARIA", short: "CPU prioritaria", title: "Una de las CPUs que pediste ver primero" },
};

const HEADLINE_ORDER: DealLabelId[] = ["urgent", "auction", "gpu", "special", "great"];
const CHIP_ORDER: DealLabelId[] = ["urgent", "gpu", "special", "great", "priority", "auction"];

/** Todas las etiquetas que le tocan a la oferta, ya en el orden de jerarquía. */
export function dealLabels(deal: Deal): { headline: DealLabel | null; all: DealLabel[] } {
  const applied = new Set<DealLabelId>();
  if (deal.isUrgent) applied.add("urgent");
  if (deal.isAuction) applied.add("auction");
  if (deal.gpu) applied.add("gpu");
  // Una 2 en 1 de baja prioridad (Dell) no cuenta como oferta 2 en 1.
  if (deal.specialLabel && !deal.specialDemoted) applied.add("special");
  if (deal.isGreatDeal && !deal.isAuction) applied.add("great");
  if (deal.isPriority) applied.add("priority");

  const headlineId = HEADLINE_ORDER.find((id) => applied.has(id) && (id !== "gpu" || deal.isGpuDesign)) ?? null;
  return {
    headline: headlineId ? LABELS[headlineId] : null,
    all: CHIP_ORDER.filter((id) => applied.has(id)).map((id) => LABELS[id]),
  };
}
