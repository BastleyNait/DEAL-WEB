import type { PublisherState, PublisherStatus, PublisherStatusRepository } from "../domain/publish-types";

interface StatusRow {
  last_seen: string;
  state: Exclude<PublisherState, "offline">;
  current_title: string | null;
}

/** Si el último latido es más viejo que esto, el publicador se considera apagado (él late cada 10 s). */
const STALE_MS = 30_000;

/** Lee `publisher_status_public`: el propio publicador avisa ahí que está vivo; una página web no puede mirar tu PC. */
export class SupabasePublisherStatusRepository implements PublisherStatusRepository {
  constructor(
    private readonly supabaseUrl: string,
    private readonly anonKey: string,
  ) {}

  async read(): Promise<PublisherStatus> {
    const res = await fetch(`${this.supabaseUrl}/rest/v1/publisher_status_public?select=*`, {
      headers: { apikey: this.anonKey, Authorization: `Bearer ${this.anonKey}` },
    });
    if (!res.ok) throw new Error(`No se pudo leer publisher_status_public (${res.status}): ${await res.text()}`);

    const [row] = (await res.json()) as StatusRow[];
    if (!row) return { state: "offline", currentTitle: null };

    // Se compara con la hora de este navegador: un reloj muy desfasado marcaría
    // "apagado" de más; es un aviso informativo, no bloquea nada.
    const alive = Date.now() - new Date(row.last_seen).getTime() < STALE_MS;
    return alive ? { state: row.state, currentTitle: row.current_title } : { state: "offline", currentTitle: null };
  }
}
