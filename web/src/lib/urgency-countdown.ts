import { eq } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import { getDb, urgencyCountdown } from "@/db";

export interface UrgencyCountdownConfig {
  enabled: boolean;
  durationMinutes: number;
  label: string;
}

const DEFAULTS: UrgencyCountdownConfig = {
  enabled: true,
  durationMinutes: 167, // 2h47min
  label: "oferta por tempo limitado",
};

const URGENCY_COUNTDOWN_TAG = "urgency-countdown";

/**
 * Config do contador de urgência (não é um prazo global — cada visitante tem o próprio,
 * guardado no localStorage do navegador dele). Cacheada 60s (muda raro, roda em toda
 * pageview) — writes do admin invalidam na hora com revalidateTag.
 */
export const getUrgencyCountdown = unstable_cache(
  async (): Promise<UrgencyCountdownConfig> => {
    const db = await getDb();
    const [row] = await db.select().from(urgencyCountdown).where(eq(urgencyCountdown.id, "main")).limit(1);
    return row ? { enabled: row.enabled, durationMinutes: row.durationMinutes, label: row.label } : DEFAULTS;
  },
  ["urgency-countdown-settings"],
  { tags: [URGENCY_COUNTDOWN_TAG], revalidate: 60 },
);

export async function updateUrgencyCountdown(config: UrgencyCountdownConfig): Promise<void> {
  const db = await getDb();
  await db
    .insert(urgencyCountdown)
    .values({ id: "main", ...config })
    .onConflictDoUpdate({ target: urgencyCountdown.id, set: { ...config, updatedAt: new Date() } });
  revalidateTag(URGENCY_COUNTDOWN_TAG, { expire: 0 });
}
