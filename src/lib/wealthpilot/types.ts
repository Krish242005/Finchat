import type { Transaction } from '@/lib/types';

export type LeakType = 
  | 'recurring_subscription'
  | 'discretionary_spike'
  | 'duplicate_charge'
  | 'avoidable_fee'
  | 'impulse_surge';

export interface DetectedLeak {
  id: string;
  type: LeakType;
  title: string;
  category: string;
  monthlyAmount: number;
  totalFlaggedAmount: number;
  confidence: number; // 0.0 to 1.0
  detectionReason: string;
  transactionIds: string[];
  transactions: Transaction[];
  isRecurring: boolean;
  frequencyDescription?: string;
}

export interface SavingsOpportunity {
  leakId: string;
  leakTitle: string;
  leakType: LeakType;
  category: string;
  monthlySpend: number;
  realisticReductionTargetPercent: number; // e.g. 40%
  conservativeReductionTargetPercent: number; // e.g. 25%
  maxReductionTargetPercent: number; // e.g. 100%
  realisticMonthlySavings: number;
  conservativeMonthlySavings: number;
  maxMonthlySavings: number;
  estimatedAnnualSavings: number;
  status: 'active' | 'accepted' | 'dismissed' | 'addressed';
  customReductionPercent?: number;
  transactions: Transaction[];
  explanation: string;
}

export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
export type TimeHorizon = 'short' | 'medium' | 'long'; // short: <12m, medium: 1-3y, long: 3-7y+

export interface UserFinancialProfile {
  monthlyIncome?: number;
  monthlyExpenses: number;
  monthlyDiscretionarySpending: number;
  emergencyFundMonthsAvailable: number; // e.g. 1.5 months
  hasHighInterestDebt: boolean;
  debtMonthlyObligation: number;
  riskTolerance: RiskTolerance;
  timeHorizon: TimeHorizon;
  primaryGoal: 'emergency_buffer' | 'debt_paydown' | 'wealth_accumulation' | 'capital_preservation';
}

export interface InvestmentDestination {
  id: string;
  tier: 1 | 2 | 3 | 4;
  categoryName: string; // e.g. "Emergency Liquid Fund / High-Yield Savings", "Index Mutual Fund"
  allocationPercentage: number; // e.g. 60%
  suggestedMonthlyAmount: number;
  suitabilityScore: number; // 0 to 100
  suitabilityExplanation: string;
  riskLevel: 'Very Low' | 'Low' | 'Moderate' | 'High';
  liquidityNotes: string;
  costsAndFees: string; // e.g. "Zero exit load after 7 days, expense ratio ~0.15%-0.25%"
  taxConsiderations: string; // Indian tax law implications (LTCG/STCG)
  estimatedFutureValues: {
    year1: number;
    year3: number;
    year5: number;
    assumedAnnualReturnPercent: number;
    assumptionNote: string;
  };
  recommendedAssetTypes: string[];
}

export interface SafetyAuditCheck {
  id: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  suggestedAction?: string;
}

export interface SafetyAuditReport {
  isSafeToInvest: boolean;
  primaryPriority: 'emergency_savings' | 'debt_prepayment' | 'conservative_investing' | 'equity_growth';
  checks: SafetyAuditCheck[];
  disclaimer: string;
  missingInformationPrompts: string[];
}

export interface WealthPilotReport {
  generatedAt: string;
  dateRangeDescription: string;
  totalAvoidableSpend: number;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  suggestedMonthlyInvestment: number;
  confirmedSavingsAccumulated: number;
  detectedLeaks: DetectedLeak[];
  opportunities: SavingsOpportunity[];
  destinations: InvestmentDestination[];
  safetyAudit: SafetyAuditReport;
  summaryNarrative: string;
}
