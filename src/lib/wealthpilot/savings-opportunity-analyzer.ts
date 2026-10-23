import type { DetectedLeak, SavingsOpportunity } from './types';

export interface SavingsAnalysisResult {
  opportunities: SavingsOpportunity[];
  totalAvoidableSpendMonthly: number;
  totalRealisticMonthlySavings: number;
  totalConservativeMonthlySavings: number;
  totalMaxMonthlySavings: number;
  totalEstimatedAnnualSavings: number;
  confirmedSavingsAccumulated: number;
}

/**
 * Agent 2 — Savings Opportunity Analyzer
 * Transforms raw detected leaks into realistic, non-double-counted monthly & annual savings targets.
 */
export function runSavingsOpportunityAnalyzer(
  detectedLeaks: DetectedLeak[],
  savedOpportunitiesState?: Record<string, { status?: 'active' | 'accepted' | 'dismissed' | 'addressed'; customPercent?: number }>
): SavingsAnalysisResult {
  const seenTxIds = new Set<string>();
  const opportunities: SavingsOpportunity[] = [];

  detectedLeaks.forEach(leak => {
    // Prevent double-counting: only evaluate transactions not already accounted for by another higher-confidence leak
    const uniqueContributingTxs = leak.transactions.filter(tx => !seenTxIds.has(tx.id));
    if (uniqueContributingTxs.length === 0) return;

    uniqueContributingTxs.forEach(tx => seenTxIds.add(tx.id));

    // Dynamic reduction target percentages based on leak category & recurrence:
    let realisticPercent = 40; // Default 40% reduction
    let conservativePercent = 25; // Conservative 25% reduction
    let maxPercent = 100;

    switch (leak.type) {
      case 'duplicate_charge':
        // Duplicate charges can be disputed 100%
        realisticPercent = 100;
        conservativePercent = 100;
        maxPercent = 100;
        break;

      case 'avoidable_fee':
        // Bank penalties and avoidable late fees can be 100% eliminated through auto-pay
        realisticPercent = 100;
        conservativePercent = 80;
        maxPercent = 100;
        break;

      case 'recurring_subscription':
        // Subscriptions can typically be audited and cut by 50% (canceling unused platforms)
        realisticPercent = 50;
        conservativePercent = 30;
        maxPercent = 100;
        break;

      case 'discretionary_spike':
        // Food & dining delivery can be reduced by 40% through planned home groceries
        realisticPercent = 40;
        conservativePercent = 25;
        maxPercent = 80; // Not 100% since nourishment is essential
        break;

      case 'impulse_surge':
        // Shopping impulse purchases can be trimmed by 40%-50%
        realisticPercent = 45;
        conservativePercent = 25;
        maxPercent = 85;
        break;
    }

    // Retrieve user custom overrides if previously adjusted
    const saved = savedOpportunitiesState?.[leak.id];
    const status = saved?.status || 'active';
    const activePercent = saved?.customPercent !== undefined ? saved.customPercent : realisticPercent;

    const monthlySpend = leak.monthlyAmount;
    const realisticMonthly = Math.round((monthlySpend * (activePercent / 100)));
    const conservativeMonthly = Math.round((monthlySpend * (conservativePercent / 100)));
    const maxMonthly = Math.round((monthlySpend * (maxPercent / 100)));
    const estimatedAnnual = realisticMonthly * 12;

    const explanation = leak.type === 'duplicate_charge' || leak.type === 'avoidable_fee'
      ? `Disputing this charge or setting auto-pay recovers up to ₹${monthlySpend.toLocaleString('en-IN')}.`
      : `Trimming discretionary spend by ${activePercent}% could realistically unlock ~₹${realisticMonthly.toLocaleString('en-IN')}/month (~₹${estimatedAnnual.toLocaleString('en-IN')}/year) without compromising essentials.`;

    opportunities.push({
      leakId: leak.id,
      leakTitle: leak.title,
      leakType: leak.type,
      category: leak.category,
      monthlySpend,
      realisticReductionTargetPercent: activePercent,
      conservativeReductionTargetPercent: conservativePercent,
      maxReductionTargetPercent: maxPercent,
      realisticMonthlySavings: realisticMonthly,
      conservativeMonthlySavings: conservativeMonthly,
      maxMonthlySavings: maxMonthly,
      estimatedAnnualSavings: estimatedAnnual,
      status,
      customReductionPercent: saved?.customPercent,
      transactions: uniqueContributingTxs,
      explanation
    });
  });

  // Calculate totals across all active or accepted opportunities (dismissed are excluded from total investment capacity)
  const countableOpps = opportunities.filter(o => o.status !== 'dismissed');

  const totalAvoidableSpendMonthly = countableOpps.reduce((sum, o) => sum + o.monthlySpend, 0);
  const totalRealisticMonthlySavings = countableOpps.reduce((sum, o) => sum + o.realisticMonthlySavings, 0);
  const totalConservativeMonthlySavings = countableOpps.reduce((sum, o) => sum + o.conservativeMonthlySavings, 0);
  const totalMaxMonthlySavings = countableOpps.reduce((sum, o) => sum + o.maxMonthlySavings, 0);
  const totalEstimatedAnnualSavings = countableOpps.reduce((sum, o) => sum + o.estimatedAnnualSavings, 0);

  // Confirmed savings accumulated from opportunities marked as "addressed" or confirmed in subsequent months
  const addressedOpps = opportunities.filter(o => o.status === 'addressed');
  const confirmedSavingsAccumulated = addressedOpps.reduce((sum, o) => sum + o.realisticMonthlySavings, 0);

  return {
    opportunities,
    totalAvoidableSpendMonthly,
    totalRealisticMonthlySavings,
    totalConservativeMonthlySavings,
    totalMaxMonthlySavings,
    totalEstimatedAnnualSavings,
    confirmedSavingsAccumulated
  };
}
