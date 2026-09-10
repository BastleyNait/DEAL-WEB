<script setup lang="ts">
import type { Deal } from "../domain/types";

const props = defineProps<{ deal: Deal }>();

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}
</script>

<template>
  <a class="card" :class="{ great: props.deal.isGreatDeal }" :href="props.deal.url" target="_blank" rel="noopener noreferrer">
    <img v-if="props.deal.imageUrl" class="thumb" :src="props.deal.imageUrl" loading="lazy" alt="" />
    <div v-else class="thumb"></div>

    <div class="card-body">
      <div class="badges">
        <span v-if="props.deal.isGreatDeal" class="badge great">⚡ Ofertaza</span>
        <span v-if="props.deal.cpuMatch" class="badge">{{ props.deal.cpuMatch }}</span>
        <span v-if="props.deal.condition" class="badge">{{ props.deal.condition }}</span>
      </div>

      <div class="title">{{ props.deal.title }}</div>
      <div class="price">${{ Math.round(props.deal.price ?? 0) }} {{ props.deal.currency }}</div>

      <div class="score-bar"><div :style="{ width: `${props.deal.score ?? 0}%` }"></div></div>

      <div class="meta">
        <span>Puntaje {{ props.deal.score ?? "?" }}/100</span>
        <span>{{ timeAgo(props.deal.firstSeenAt) }}</span>
      </div>
    </div>
  </a>
</template>

<style scoped>
.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: var(--text);
  transition: transform 0.12s ease, border-color 0.12s ease;
}
.card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
}
.card.great {
  border-color: var(--great);
  box-shadow: 0 0 0 1px var(--great) inset;
}
.thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--panel-2);
  object-fit: contain;
}
.card-body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--panel-2);
  color: var(--muted);
  border: 1px solid var(--border);
}
.badge.great {
  background: rgba(255, 176, 32, 0.15);
  color: var(--great);
  border-color: var(--great);
}
.title {
  font-size: 14px;
  line-height: 1.3;
  font-weight: 600;
  margin: 2px 0;
}
.price {
  font-size: 20px;
  font-weight: 700;
  color: var(--good);
}
.meta {
  font-size: 12px;
  color: var(--muted);
  display: flex;
  justify-content: space-between;
}
.score-bar {
  height: 5px;
  border-radius: 3px;
  background: var(--panel-2);
  overflow: hidden;
}
.score-bar > div {
  height: 100%;
  background: var(--accent);
}
</style>
