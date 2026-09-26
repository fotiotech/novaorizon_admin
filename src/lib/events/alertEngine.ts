import { connection } from "@/utils/connection";
import { Event } from "@/models/Event";
import { AlertRule } from "@/models/AlertRule";

export interface AlertFire {
  rule: string;
  metric: string;
  value: number;
  threshold: number;
  comparator: "gt" | "lt";
}

async function computeMetric(metric: string, since: Date): Promise<number> {
  if (metric === "purchase_count") {
    return Event.countDocuments({
      isBot: false,
      eventType: "purchase",
      timestamp: { $gte: since },
    });
  }

  if (metric === "revenue") {
    const [r] = await Event.aggregate([
      {
        $match: {
          isBot: false,
          eventType: "purchase",
          timestamp: { $gte: since },
        },
      },
      { $group: { _id: null, total: { $sum: "$metadata.total" } } },
    ]);
    return r?.total ?? 0;
  }

  if (metric === "zero_traffic") {
    return Event.countDocuments({ isBot: false, timestamp: { $gte: since } });
  }

  if (metric === "cart_abandon_rate") {
    const [r] = await Event.aggregate([
      {
        $match: {
          isBot: false,
          timestamp: { $gte: since },
          eventType: { $in: ["cart_add", "purchase"] },
        },
      },
      {
        $group: {
          _id: null,
          cartAdds: {
            $sum: { $cond: [{ $eq: ["$eventType", "cart_add"] }, 1, 0] },
          },
          purchases: {
            $sum: { $cond: [{ $eq: ["$eventType", "purchase"] }, 1, 0] },
          },
        },
      },
    ]);
    if (!r || r.cartAdds === 0) return 0;
    return (r.cartAdds - r.purchases) / r.cartAdds;
  }

  return 0;
}

export async function evaluateAlerts(): Promise<AlertFire[]> {
  await connection();
  const rules = await AlertRule.find({ enabled: true });
  const fires: AlertFire[] = [];

  for (const rule of rules) {
    if (
      rule.lastFiredAt &&
      Date.now() - rule.lastFiredAt.getTime() < rule.cooldown * 1000
    ) {
      continue;
    }

    const since = new Date(Date.now() - rule.window * 1000);
    const value = await computeMetric(rule.metric, since);

    const shouldFire =
      rule.comparator === "gt"
        ? value > rule.threshold
        : value < rule.threshold;

    if (shouldFire) {
      fires.push({
        rule: rule.name,
        metric: rule.metric,
        value,
        threshold: rule.threshold,
        comparator: rule.comparator,
      });
      rule.lastFiredAt = new Date();
      await rule.save();
      // await sendSlack(...)  // wire your channel
    }
  }

  return fires;
}
