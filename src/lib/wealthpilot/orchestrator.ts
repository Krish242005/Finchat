import type { Transaction } from '@/lib/types';
import type { 
  WealthPilotReport, 
  UserFinancialProfile, 
  RiskTolerance, 
  TimeHorizon 
} from './types';
import { runLeakDetectionAgent } from './leak-detection-agent';
import { runSavingsOpportunityAnalyzer } from './savings-opportunity-analyzer';
import { runWealthPilotGuidanceAgent } from './wealthpilot-guidance-agent';
import { runFinancialSafetyAgent } from './financial-safety-agent';
import { isEligibleExpense, normalizeDateToISO } from '@/lib/budget-calculations';

export interface RunWealthPilotOptions {
  transactions: Transaction[];
  totalBalance?: number;
  monthlySpending?: number;
  customProfileOverrides?: Partial<UserFinancialProfile>;
  savedOpportunitiesState?: Record<string, { status?: 'active' | 'accepted' | 'dismissed' | 'addressed'; customPercent?: number }>;
}

/**
 * Builds an automated baseline financial profile from actual transaction data.
 */
export function buildProfileFromTransactions(
  transactions: Transaction[],
  totalBalance = 0,
  overrides?: Partial<UserFinancialProfile>
): UserFinancialProfile {
  const eligible = transactions.filter(isEligibleExpense);

  // Compute monthly spending run-rate
  const sortedDates = [...eligible]
    .map(t => normalizeDateToISO(t.date))
    .filter(Boolean)
    .sort();

  let months = 1;
  if (sortedDates.length >= 2) {
    const d1 = new Date(sortedDates[0]);
    const d2 = new Date(sortedDates[sortedDates.length - 1]);
    const days = Math.max(1, (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    months = Math.max(1, Math.round((days / 30) * 10) / 10);
  }

  const totalSpent = eligible.reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = Math.max(1000, Math.round(totalSpent / months));

  // Compute discretionary spending (Food, Shopping, Entertainment)
  const discretionarySpent = eligible
    .filter(t => ['Food', 'Shopping', 'Entertainment'].includes(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyDiscretionarySpending = Math.round(discretionarySpent / months);

  // Estimate emergency fund buffer based on total bank balance vs monthly expenses
  const emergencyFundMonthsAvailable = monthlyExpenses > 0 
    ? Math.round((totalBalance / monthlyExpenses) * 10) / 10 
    : 0;

  // Check for debt obligations (EMI category or credit card loans)
  const emiTxs = eligible.filter(t => t.category === 'EMI');
  const debtMonthlyObligation = emiTxs.reduce((sum, t) => sum + t.amount, 0) / months;
  const hasHighInterestDebt = emiTxs.some(t => {
    const desc = (t.description || '').toLowerCase();
    return desc.includes('credit card') || desc.includes('personal loan') || desc.includes('overdraft');
  });

  const defaultProfile: UserFinancialProfile = {
    monthlyIncome: 0,
    monthlyExpenses,
    monthlyDiscretionarySpending,
    emergencyFundMonthsAvailable,
    hasHighInterestDebt,
    debtMonthlyObligation: Math.round(debtMonthlyObligation),
    riskTolerance: (overrides?.riskTolerance as RiskTolerance) || 'moderate',
    timeHorizon: (overrides?.timeHorizon as TimeHorizon) || (emergencyFundMonthsAvailable < 3 ? 'short' : 'medium'),
    primaryGoal: hasHighInterestDebt ? 'debt_paydown' : (emergencyFundMonthsAvailable < 3 ? 'emergency_buffer' : 'wealth_accumulation')
  };

  return {
    ...defaultProfile,
    ...overrides
  };
}

/**
 * Executes the full WealthPilot AI multi-agent workflow
 */
export function runWealthPilotWorkflow(options: RunWealthPilotOptions): WealthPilotReport {
  const { 
    transactions, 
    totalBalance = 0, 
    customProfileOverrides, 
    savedOpportunitiesState 
  } = options;

  // 1. Run Agent 1: Leak Detection Agent
  const detectedLeaks = runLeakDetectionAgent(transactions);

  // 2. Run Agent 2: Savings Opportunity Analyzer
  const savingsAnalysis = runSavingsOpportunityAnalyzer(detectedLeaks, savedOpportunitiesState);

  // 3. Assemble User Financial Profile
  const profile = buildProfileFromTransactions(transactions, totalBalance, customProfileOverrides);

  // 4. Run Agent 3: Investment Guidance Agent
  const suggestedMonthlyInvestment = savingsAnalysis.totalRealisticMonthlySavings;
  const destinations = runWealthPilotGuidanceAgent(suggestedMonthlyInvestment, profile);

  // 5. Run Agent 4: Financial Safety and Validation Agent
  const safetyAudit = runFinancialSafetyAgent(
    savingsAnalysis.opportunities,
    destinations,
    profile,
    suggestedMonthlyInvestment
  );

  // Date range description for transparency
  const dates = transactions.map(t => normalizeDateToISO(t.date)).filter(Boolean).sort();
  const dateRangeDescription = dates.length >= 2 
    ? `${dates[0]} to ${dates[dates.length - 1]}`
    : 'Recent transaction period';

  // Summary narrative
  let summaryNarrative = '';
  if (savingsAnalysis.opportunities.length === 0) {
    summaryNarrative = 'No recurring waste or high-discretionary spending spikes were detected in this period. Your current spending aligns with essential and budgeted living patterns.';
  } else {
    summaryNarrative = `WealthPilot AI evaluated ${transactions.length} transactions and identified ${savingsAnalysis.opportunities.length} potential spending leak patterns totaling ₹${savingsAnalysis.totalAvoidableSpendMonthly.toLocaleString('en-IN')}/month. By applying realistic 25%–50% reduction targets, you could potentially unlock ~₹${savingsAnalysis.totalRealisticMonthlySavings.toLocaleString('en-IN')}/month (~₹${savingsAnalysis.totalEstimatedAnnualSavings.toLocaleString('en-IN')}/year) to channel toward ${safetyAudit.primaryPriority.replace('_', ' ')}.`;
  }

  return {
    generatedAt: new Date().toISOString(),
    dateRangeDescription,
    totalAvoidableSpend: savingsAnalysis.totalAvoidableSpendMonthly,
    estimatedMonthlySavings: savingsAnalysis.totalRealisticMonthlySavings,
    estimatedAnnualSavings: savingsAnalysis.totalEstimatedAnnualSavings,
    suggestedMonthlyInvestment,
    confirmedSavingsAccumulated: savingsAnalysis.confirmedSavingsAccumulated,
    detectedLeaks,
    opportunities: savingsAnalysis.opportunities,
    destinations,
    safetyAudit,
    summaryNarrative
  };
}
