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
  const specs = computed(() => {
    const d = toValue(deal);
    return [d.cpuMatch, ramLabel(d.title), storageLabel(d.title), screenLabel(d.title)].filter(
      (s): s is string => Boolean(s),
    );
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

  const countdown = computed(() => {
    const d = toValue(deal);
    if (!d.isAuction || !d.endDate) return null;
    const msLeft = new Date(d.endDate).getTime() - toValue(now);
    if (msLeft <= 0) return { text: "cerrada", urgent: false, over: true };

    const minutes = Math.floor(msLeft / 60_000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const text = days > 0 ? `${days}d ${hours % 24}h` : hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
    return { text, urgent: hours < 6, over: false };
  });

  const seller = computed(() => {
    const { sellerFeedbackScore: score, sellerFeedbackPercentage: pct } = toValue(deal);
    if (score === null && pct === null) return null;
    const sales = score !== null ? `${score.toLocaleString("es")} ventas` : "";
    const rating = pct !== null ? `${pct}%` : "";
    return [sales, rating].filter(Boolean).join(" · ");
  });

  const seenAgo = computed(() => {
    const minutes = Math.floor((toValue(now) - new Date(toValue(deal).firstSeenAt).getTime()) / 60_000);
    if (minutes < 1) return "recién";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} d`;
  });

  return { specs, flags, overBudget, scoreTone, countdown, seller, seenAgo };
}
