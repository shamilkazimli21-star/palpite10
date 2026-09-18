import {
  AGENT_CONFIG,
  type CriterionKey,
} from "@/src/config/agent";

export type ExtractedCriterion = {
  value: number;
  evidence: string;
};

export type ExtractedCriteria = Partial<
  Record<CriterionKey, ExtractedCriterion>
>;

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function calculateScore(
  storedCriteria: Array<{
    criterion_key: string;
    value: number;
  }>
) {
  const weightMap = new Map(
    AGENT_CONFIG.criteria.map((criterion) => [
      criterion.key,
      criterion.weight,
    ])
  );

  let earned = 0;
  let maximum = 0;

  for (const criterion of AGENT_CONFIG.criteria) {
    maximum += criterion.weight;

    const stored = storedCriteria.find(
      (item) => item.criterion_key === criterion.key
    );

    const value = stored
      ? clamp(Number(stored.value))
      : 0;

    earned += value * criterion.weight;
  }

  if (!maximum) return 0;

  return Math.round((earned / maximum) * 100);
}
