import type { 
  UserFinancialProfile, 
  SavingsOpportunity, 
  InvestmentDestination, 
  SafetyAuditReport, 
  SafetyAuditCheck 
} from './types';

/**
 * Agent 4 — Financial Safety and Validation Agent
 * Independent safety watchdog ensuring every investment suggestion adheres to sound financial planning hierarchy.
 */
export function runFinancialSafetyAgent(
  opportunities: SavingsOpportunity[],
  destinations: InvestmentDestination[],
  profile: UserFinancialProfile,
  totalMonthlySavingsOpportunity: number
): SafetyAuditReport {
  const checks: SafetyAuditCheck[] = [];
  const missingInformationPrompts: string[] = [];

  // Check 1: Emergency Reserve Sufficiency
  const emergencyMonths = profile.emergencyFundMonthsAvailable;
  if (emergencyMonths < 3) {
    checks.push({
      id: 'safety-emergency-reserves',
      passed: false,
      severity: 'critical',
      title: 'Emergency Reserve Below Prudent Threshold',
      message: `Your estimated liquid cash cushion covers ~${emergencyMonths.toFixed(1)} months of living expenses. Standard financial safety mandates at least 3-6 months in accessible reserves before aggressive equity deployment.`,
      suggestedAction: 'Channel the majority of monthly savings opportunities into high-yield savings or overnight/liquid funds until your reserve reaches 3-6 months of expenses.'
    });
  } else {
    checks.push({
      id: 'safety-emergency-reserves',
      passed: true,
      severity: 'info',
      title: 'Emergency Reserves Adequate',
      message: `Liquid reserves cover ~${emergencyMonths.toFixed(1)} months of living costs. You have sufficient liquidity to safely allocate surplus cash into medium- and long-term investments.`
    });
  }

  // Check 2: High-Interest Debt Exposure
  if (profile.hasHighInterestDebt) {
    checks.push({
      id: 'safety-debt-obligations',
      passed: false,
      severity: 'critical',
      title: 'Active High-Interest Consumer Debt Detected',
      message: `Outstanding consumer loans or credit card balances often accrue interest between 18% and 36% p.a. No market investment can reliably match this return risk-free.`,
      suggestedAction: 'Prepay highest-interest balances first (Debt Avalanche method) to lock in an immediate, guaranteed tax-free return.'
    });
  } else {
    checks.push({
      id: 'safety-debt-obligations',
      passed: true,
      severity: 'info',
      title: 'No Severe High-Interest Debt',
      message: 'No punitive credit card APRs or unsecured personal loans flagged. Surplus cash is fully eligible for wealth accumulation.'
    });
  }

  // Check 3: Realistic Savings vs Living Expenses (Sanity Check)
  const monthlyExpenses = profile.monthlyExpenses || 1;
  const savingsToExpenseRatio = (totalMonthlySavingsOpportunity / monthlyExpenses) * 100;

  if (savingsToExpenseRatio > 60) {
    checks.push({
      id: 'safety-savings-sanity',
      passed: false,
      severity: 'warning',
      title: 'Aggressive Spending Reduction Flagged',
      message: `Projected savings of ₹${totalMonthlySavingsOpportunity.toLocaleString('en-IN')} represents over ${Math.round(savingsToExpenseRatio)}% of total monthly spending. Enforcing too drastic a cut immediately may lead to budget fatigue.`,
      suggestedAction: 'Start with a conservative 20%-30% reduction in month 1, then scale up progressively.'
    });
  } else {
    checks.push({
      id: 'safety-savings-sanity',
      passed: true,
      severity: 'info',
      title: 'Sustainable Savings Target',
      message: `Projected savings target (₹${totalMonthlySavingsOpportunity.toLocaleString('en-IN')}/mo) represents ~${Math.round(savingsToExpenseRatio)}% of monthly expenditure, maintaining essential living standards.`
    });
  }

  // Check 4: Check for Missing Information
  if (!profile.monthlyIncome || profile.monthlyIncome === 0) {
    missingInformationPrompts.push('Exact take-home monthly salary / income');
  }
  if (profile.timeHorizon === undefined) {
    missingInformationPrompts.push('Target investment horizon (e.g., <12 months vs 3-5 years)');
  }
  if (profile.riskTolerance === undefined) {
    missingInformationPrompts.push('Risk appetite for market volatility');
  }

  // Determine Primary Financial Priority
  let primaryPriority: 'emergency_savings' | 'debt_prepayment' | 'conservative_investing' | 'equity_growth' = 'equity_growth';
  if (profile.hasHighInterestDebt) {
    primaryPriority = 'debt_prepayment';
  } else if (profile.emergencyFundMonthsAvailable < 3) {
    primaryPriority = 'emergency_savings';
  } else if (profile.timeHorizon === 'short' || profile.riskTolerance === 'conservative') {
    primaryPriority = 'conservative_investing';
  }

  const isSafeToInvest = !profile.hasHighInterestDebt && (profile.emergencyFundMonthsAvailable >= 1.5 || destinations.some(d => d.tier === 1));

  const disclaimer = 'WealthPilot AI provides educational financial guidance and mathematical projections. It does not provide SEBI-registered individualized investment advisory, guarantee future returns, or initiate automated financial transactions. Mutual fund investments are subject to market risks; read all scheme-related documents carefully before investing.';

  return {
    isSafeToInvest,
    primaryPriority,
    checks,
    disclaimer,
    missingInformationPrompts
  };
}
