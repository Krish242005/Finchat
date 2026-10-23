import type { 
  UserFinancialProfile, 
  InvestmentDestination, 
  TimeHorizon, 
  RiskTolerance 
} from './types';

/**
 * Calculates compound future value with monthly contributions:
 * FV = P * (((1 + r/12)^(12*t) - 1) / (r/12))
 */
export function calculateFutureValueMonthlySIP(monthlyAmount: number, annualReturnRatePercent: number, years: number): number {
  if (monthlyAmount <= 0 || years <= 0) return 0;
  const monthlyRate = (annualReturnRatePercent / 100) / 12;
  const totalMonths = years * 12;
  
  if (monthlyRate === 0) {
    return monthlyAmount * totalMonths;
  }
  
  const fv = monthlyAmount * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
  return Math.round(fv);
}

/**
 * Agent 3 — WealthPilot AI Investment Guidance Agent
 * Recommends structured, non-speculative wealth destinations tailored to user's liquidity and risk capacity.
 */
export function runWealthPilotGuidanceAgent(
  monthlySavingsAmount: number,
  profile: UserFinancialProfile
): InvestmentDestination[] {
  if (monthlySavingsAmount <= 0) {
    return [];
  }

  const destinations: InvestmentDestination[] = [];

  // 1. Destination Option: Emergency Liquid Reserve (Tier 1 Priority)
  // Needed if emergency fund is < 3 months of expenses or short horizon
  const isEmergencyUnderfunded = profile.emergencyFundMonthsAvailable < 3;
  const isShortHorizon = profile.timeHorizon === 'short';

  if (isEmergencyUnderfunded || isShortHorizon) {
    const allocation = isEmergencyUnderfunded ? 0.70 : 0.40; // 70% if underfunded, 40% if short horizon
    const monthlyAmt = Math.round(monthlySavingsAmount * allocation);

    destinations.push({
      id: 'dest-emergency-liquid',
      tier: 1,
      categoryName: 'Emergency Reserve / Liquid Funds & High-Yield Savings',
      allocationPercentage: Math.round(allocation * 100),
      suggestedMonthlyAmount: monthlyAmt,
      suitabilityScore: isEmergencyUnderfunded ? 96 : 85,
      suitabilityExplanation: isEmergencyUnderfunded
        ? `Your liquid emergency cushion covers only ~${profile.emergencyFundMonthsAvailable.toFixed(1)} months of expenses (healthy benchmark is 3-6 months). Prioritizing capital preservation and instant liquidity shields you from taking high-cost loans during unforeseen emergencies.`
        : 'Suited for capital required within the next 12 months with immediate redemption accessibility.',
      riskLevel: 'Very Low',
      liquidityNotes: 'Instant access (T+0 up to ₹50,000 via insta-redemption; T+1 business day for full balance). No lock-in period.',
      costsAndFees: 'Low expense ratio (~0.12% - 0.20% p.a.). Zero exit load after 7 days.',
      taxConsiderations: 'Taxed as per your applicable income tax slab rate under Section 50AA (Debt fund taxation without indexation).',
      estimatedFutureValues: {
        year1: calculateFutureValueMonthlySIP(monthlyAmt, 6.5, 1),
        year3: calculateFutureValueMonthlySIP(monthlyAmt, 6.5, 3),
        year5: calculateFutureValueMonthlySIP(monthlyAmt, 6.5, 5),
        assumedAnnualReturnPercent: 6.5,
        assumptionNote: 'Assumes conservative 6.5% p.a. pre-tax yield typical of short-term liquid instruments. Past performance is not a guarantee of future returns.'
      },
      recommendedAssetTypes: [
        'SEBI-regulated Liquid Mutual Funds (Overnight / Liquid categories)',
        'Scheduled Commercial Bank High-Yield Savings Deposits (DICGC insured up to ₹5 Lakh)'
      ]
    });
  }

  // 2. Destination Option: High-Interest Debt Prepayment (Tier 2 Priority)
  if (profile.hasHighInterestDebt) {
    const allocation = isEmergencyUnderfunded ? 0.30 : 0.60;
    const monthlyAmt = Math.round(monthlySavingsAmount * allocation);

    destinations.push({
      id: 'dest-debt-prepayment',
      tier: 2,
      categoryName: 'Accelerated High-Interest Debt Prepayment',
      allocationPercentage: Math.round(allocation * 100),
      suggestedMonthlyAmount: monthlyAmt,
      suitabilityScore: 98,
      suitabilityExplanation: 'Credit cards and personal loans carry APRs of 18%-36% p.a. Directing recovered spending leaks toward paying down high-cost balances generates a risk-free, guaranteed effective return equal to the interest saved.',
      riskLevel: 'Very Low',
      liquidityNotes: 'Principal is committed to reducing outstanding debt principal; not redeemable as cash, but immediately frees future monthly cash flow.',
      costsAndFees: 'Check with lender for minimal prepayment foreclosure fees (often 0% for floating-rate consumer loans).',
      taxConsiderations: 'Personal debt interest offers no tax deduction; extinguishing it produces pure tax-free cash savings.',
      estimatedFutureValues: {
        year1: calculateFutureValueMonthlySIP(monthlyAmt, 18.0, 1),
        year3: calculateFutureValueMonthlySIP(monthlyAmt, 18.0, 3),
        year5: calculateFutureValueMonthlySIP(monthlyAmt, 18.0, 5),
        assumedAnnualReturnPercent: 18.0,
        assumptionNote: 'Represents interest expense avoided at an estimated 18.0% annual debt rate, mathematically outperforming uncertain market investments.'
      },
      recommendedAssetTypes: [
        'Credit Card Outstanding Balance Prepayment',
        'High-Interest Personal Loan / Unsecured Consumer EMI Extra Principal Repayments'
      ]
    });
  }

  // 3. Destination Option: Broad-Market Equity Index Funds (Tier 3/4 Long-Term Wealth)
  // Suited for medium/long horizons when emergency reserve is stable and high-interest debt is manageable
  if (profile.timeHorizon !== 'short' && !profile.hasHighInterestDebt) {
    const isAggressive = profile.riskTolerance === 'aggressive';
    const isConservative = profile.riskTolerance === 'conservative';
    
    // Balance allocation
    const equityAllocation = isEmergencyUnderfunded ? 0.30 : (isAggressive ? 0.80 : (isConservative ? 0.40 : 0.60));
    const monthlyAmt = Math.round(monthlySavingsAmount * equityAllocation);

    destinations.push({
      id: 'dest-equity-index',
      tier: 4,
      categoryName: 'Diversified Broad-Market Index Funds (SIP)',
      allocationPercentage: Math.round(equityAllocation * 100),
      suggestedMonthlyAmount: monthlyAmt,
      suitabilityScore: profile.timeHorizon === 'long' ? 94 : 80,
      suitabilityExplanation: 'For time horizons exceeding 3-5 years, low-cost broad index funds (such as Nifty 50 or Nifty 500) provide diversified exposure to India’s top enterprises, shielding your capital from single-stock risk while beating long-term inflation.',
      riskLevel: isConservative ? 'Moderate' : 'High',
      liquidityNotes: 'Open-ended (T+2 redemption to bank account). Minimum 3-5 year holding recommended to ride through market volatility.',
      costsAndFees: 'Ultra-low direct plan expense ratio (~0.05% - 0.20% p.a.). Zero exit load typically after 15-30 days.',
      taxConsiderations: 'LTCG taxed at 12.5% for gains exceeding ₹1.25 Lakh per financial year (holding >12 months). STCG taxed at 20% if sold within 12 months.',
      estimatedFutureValues: {
        year1: calculateFutureValueMonthlySIP(monthlyAmt, 11.5, 1),
        year3: calculateFutureValueMonthlySIP(monthlyAmt, 11.5, 3),
        year5: calculateFutureValueMonthlySIP(monthlyAmt, 11.5, 5),
        assumedAnnualReturnPercent: 11.5,
        assumptionNote: 'Hypothetical projection based on conservative 11.5% p.a. long-term historical Indian index return. Equity investments are subject to market risks and returns can fluctuate.'
      },
      recommendedAssetTypes: [
        'Nifty 50 Index Fund / BSE Sensex Index Fund (Direct, Growth)',
        'Broad Diversified Flexi-cap / Multi-cap Mutual Fund via Systematic Investment Plan (SIP)'
      ]
    });
  }

  // 4. Destination Option: Conservative Hybrid / Short-Duration Debt
  // Suited for medium term (1-3 years) or conservative investors wanting steady growth with lower volatility
  if ((profile.timeHorizon === 'medium' || profile.riskTolerance === 'conservative') && !profile.hasHighInterestDebt) {
    const debtAllocation = destinations.length === 0 ? 1.0 : (1.0 - (destinations[0]?.allocationPercentage || 50) / 100);
    const monthlyAmt = Math.max(500, Math.round(monthlySavingsAmount * Math.max(0.2, debtAllocation)));

    destinations.push({
      id: 'dest-short-duration-debt',
      tier: 3,
      categoryName: 'Short-Duration & Conservative Hybrid Funds',
      allocationPercentage: Math.round(debtAllocation * 100),
      suggestedMonthlyAmount: monthlyAmt,
      suitabilityScore: 88,
      suitabilityExplanation: 'Designed for 1 to 3 year capital deployment. Invests primarily in high-grade corporate bonds and sovereign securities, offering predictable yields with significantly lower volatility than equity markets.',
      riskLevel: 'Low',
      liquidityNotes: 'Redeemable in T+1 business days. Best held for 1-3 years to match asset maturity.',
      costsAndFees: 'Expense ratio ~0.25% - 0.45% p.a. Minimal exit load (0.25% if redeemed within 30-90 days).',
      taxConsiderations: 'Taxed at investor’s marginal income tax slab rate at redemption.',
      estimatedFutureValues: {
        year1: calculateFutureValueMonthlySIP(monthlyAmt, 7.5, 1),
        year3: calculateFutureValueMonthlySIP(monthlyAmt, 7.5, 3),
        year5: calculateFutureValueMonthlySIP(monthlyAmt, 7.5, 5),
        assumedAnnualReturnPercent: 7.5,
        assumptionNote: 'Assumes 7.5% p.a. annualized yield to maturity (YTM). Debt funds can fluctuate with interest rate movements and are not guaranteed fixed deposits.'
      },
      recommendedAssetTypes: [
        'Short-Duration Mutual Funds (Banking & PSU Debt / Corporate Bond Funds)',
        'Conservative Hybrid Mutual Funds (75-80% Debt, 20-25% Large-Cap Equity)'
      ]
    });
  }

  // Normalize allocations to sum to 100%
  const totalAlloc = destinations.reduce((sum, d) => sum + d.allocationPercentage, 0);
  if (totalAlloc > 0 && totalAlloc !== 100) {
    destinations.forEach(d => {
      d.allocationPercentage = Math.round((d.allocationPercentage / totalAlloc) * 100);
      d.suggestedMonthlyAmount = Math.round(monthlySavingsAmount * (d.allocationPercentage / 100));
    });
  }

  return destinations;
}
