import { computed, toValue, type MaybeRefOrGetter } from "vue";
import type { Deal } from "../domain/types";
import { reviewFlags } from "../domain/types";
import { ramLabel, screenLabel, storageLabel } from "../domain/listing-specs";

/**
 * Todo lo derivado de una oferta para mostrarla. Vive acá y no en el componente
 * porque la lista y la grilla muestran los mismos datos con distinto layout: si
 * cada una lo calculara por su cuenta, terminarían divergiendo.
 */
export function useDealPresentation(
  deal: MaybeRefOrGetter<Deal>,
  budget: MaybeRefOrGetter<number>,
  now: MaybeRefOrGetter<number>,
) {
  // Sin la CPU: los componentes la muestran aparte para poder resaltarla
  // cuando es una de las prioritarias.
  const specs = computed(() => {
    const d = toValue(deal);
    return [ramLabel(d.title), storageLabel(d.title), screenLabel(d.title)].filter((s): s is string => Boolean(s));
  });

  const flags = computed(() => reviewFlags(toValue(deal)));

  // Solo interesa el caso accionable: precio por encima del tope, que es la
  // excepción de reacondicionado con oferta y hay que negociarlo.
  const overBudget = computed(() => {
    const price = toValue(deal).price;
    return price != null && price > toValue(budget);
  });

  const scoreTone = computed(() => {
    const score = toValue(deal).score ?? 0;
    if (score >= 65) return "high";
    if (score >= 45) return "mid";
    return "low";
  });

  /**
   * En una subasta el tiempo que queda es lo que decide si hay que actuar ya o
   * se puede mirar mañana, así que además del texto se expone un nivel de
   * urgencia para poder codificarlo en color.
   */
  const countdown = computed(() => {
    const d = toValue(deal);
    if (!d.isAuction) return null;
    if (!d.endDate) return { text: "cierre desconocido", level: "unknown" as const, over: false };

    const msLeft = new Date(d.endDate).getTime() - toValue(now);
    if (msLeft <= 0) return { text: "cerrada", level: "over" as const, over: true };

    const minutes = Math.floor(msLeft / 60_000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const text = days > 0 ? `${days}d ${hours % 24}h` : hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes} min`;
    const level = hours < 1 ? "critical" : hours < 6 ? "urgent" : hours < 24 ? "soon" : "normal";

    return { text, level, over: false } as const;
  });

  const seller = computed(() => {
    const { sellerFeedbackScore: score, sellerFeedbackPercentage: pct } = toValue(deal);
    if (score === null && pct === null) return null;
    const sales = score !== null ? `${score.toLocaleString("es")} ventas` : "";
    const rating = pct !== null ? `${pct}%` : "";
    return [sales, rating].filter(Boolean).join(" · ");
  });

  function ago(iso: string): string {
    const minutes = Math.floor((toValue(now) - new Date(iso).getTime()) / 60_000);
    if (minutes < 1) return "recién";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} d`;
  }

  const seenAgo = computed(() => ago(toValue(deal).firstSeenAt));

  /**
   * Qué tan viejo es el precio. En una subasta cambia cada minuto y en una
   * compra directa puede venderse en cualquier momento, así que mostrar el
   * número sin su antigüedad hacía creer que estaba al día.
   */
  const checkedAgo = computed(() => {
    const checked = toValue(deal).priceCheckedAt;
    return checked ? ago(checked) : null;
  });

  const bids = computed(() => {
    const d = toValue(deal);
    if (!d.isAuction || d.bidCount == null) return null;
    return d.bidCount === 1 ? "1 puja" : `${d.bidCount} pujas`;
  });

  return { specs, flags, overBudget, scoreTone, countdown, seller, seenAgo, checkedAgo, bids };
}
