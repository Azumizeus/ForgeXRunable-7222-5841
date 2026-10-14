import { Autumn } from "autumn-js";
import { ORPCError } from "@orpc/server";
import { nf, tr } from "./i18n";

const autumn = new Autumn();

export type FeatureId = "nft_exports" | "ai_traits";

/** Throws a typed QUOTA error when the user lacks `amount` units. Fail-open if Autumn is unreachable. */
export async function requireQuota(userId: string, featureId: FeatureId, amount: number) {
  let res;
  try {
    res = await autumn.check({ customerId: userId, featureId, requiredBalance: amount });
  } catch (e) {
    console.error("[billing] check failed, allowing", e);
    return;
  }
  if (!res.allowed) {
    const remaining = res.balance?.remaining ?? 0;
    throw new ORPCError("FORBIDDEN", {
      message:
        featureId === "nft_exports"
          ? tr(
              `Quota d'export insuffisant : ${nf(amount)} NFT demandés, ${nf(remaining)} restants ce mois-ci. Passez à un plan supérieur.`,
              `Not enough export quota: ${nf(amount)} NFT requested, ${nf(remaining)} left this month. Upgrade your plan.`,
            )
          : tr(`Quota de traits IA atteint (${remaining} restants). Passez à un plan supérieur.`, `AI trait quota reached (${remaining} left). Upgrade your plan.`),
      data: { code: "QUOTA", featureId, remaining, required: amount },
    });
  }
}

export async function trackUsage(userId: string, featureId: FeatureId, value: number) {
  try {
    await autumn.track({ customerId: userId, featureId, value });
  } catch (e) {
    console.error("[billing] track failed", e);
  }
}

export async function usage(user: { id: string; name: string; email: string }) {
  try {
    const c = await autumn.customers.getOrCreate({ customerId: user.id, name: user.name, email: user.email });
    const b = (c as unknown as { balances?: Record<string, { granted?: number; remaining?: number; usage?: number; unlimited?: boolean } | null> }).balances ?? {};
    const subs = (c as unknown as { subscriptions?: { planId: string; status: string }[] }).subscriptions ?? [];
    const active = subs.find((s) => s.status === "active" && s.planId !== "free") ?? subs[0];
    const pick = (k: string) => ({
      granted: b[k]?.granted ?? 0,
      remaining: b[k]?.remaining ?? 0,
      used: b[k]?.usage ?? 0,
    });
    return { plan: active?.planId ?? "free", exports: pick("nft_exports"), ai: pick("ai_traits") };
  } catch (e) {
    console.error("[billing] usage failed", e);
    return { plan: "free", exports: { granted: 100, remaining: 100, used: 0 }, ai: { granted: 10, remaining: 10, used: 0 } };
  }
}
