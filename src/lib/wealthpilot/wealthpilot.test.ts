import { describe, it, expect } from 'vitest';
import type { Transaction } from '@/lib/types';
import { runLeakDetectionAgent } from './leak-detection-agent';
import { runSavingsOpportunityAnalyzer } from './savings-opportunity-analyzer';
import { runWealthPilotGuidanceAgent, calculateFutureValueMonthlySIP } from './wealthpilot-guidance-agent';
import { runFinancialSafetyAgent } from './financial-safety-agent';
import { runWealthPilotWorkflow } from './orchestrator';

describe('Agent 1 — Leak Detection Agent', () => {
  it('detects recurring subscription charges with high confidence', () => {
    const transactions: Transaction[] = [
      { id: 'tx-1', date: '2026-08-05', description: 'Netflix Subscription', amount: 649, category: 'Entertainment', sourceFile: 'test.csv' },
      { id: 'tx-2', date: '2026-09-05', description: 'Netflix Subscription', amount: 649, category: 'Entertainment', sourceFile: 'test.csv' },
      { id: 'tx-3', date: '2026-10-05', description: 'Netflix Subscription', amount: 649, category: 'Entertainment', sourceFile: 'test.csv' },
    ];

    const leaks = runLeakDetectionAgent(transactions);
    const netflixLeak = leaks.find(l => l.type === 'recurring_subscription');

    expect(netflixLeak).toBeDefined();
    expect(netflixLeak?.type).toBe('recurring_subscription');
    expect(netflixLeak?.monthlyAmount).toBeGreaterThan(0);
    expect(netflixLeak?.confidence).toBeGreaterThanOrEqual(0.85);
    expect(netflixLeak?.transactionIds).toContain('tx-1');
  });

  it('detects duplicate charges occurring within 48 hours for identical merchant and amount', () => {
    const transactions: Transaction[] = [
      { id: 'tx-d1', date: '2026-10-12T10:00:00Z', description: 'Uber Trip Bangalore', amount: 450, category: 'Transportation', sourceFile: 'test.csv' },
      { id: 'tx-d2', date: '2026-10-12T10:05:00Z', description: 'Uber Trip Bangalore', amount: 450, category: 'Transportation', sourceFile: 'test.csv' },
    ];

    const leaks = runLeakDetectionAgent(transactions);
    const duplicateLeak = leaks.find(l => l.type === 'duplicate_charge');

    expect(duplicateLeak).toBeDefined();
    expect(duplicateLeak?.type).toBe('duplicate_charge');
    expect(duplicateLeak?.isRecurring).toBe(false);
    expect(duplicateLeak?.confidence).toBeGreaterThanOrEqual(0.8);
    expect(duplicateLeak?.transactionIds.length).toBe(2);
  });

  it('detects avoidable bank fees, surcharges, and penal late fees', () => {
    const transactions: Transaction[] = [
      { id: 'tx-f1', date: '2026-10-02', description: 'ATM Surcharge Fee', amount: 50, category: 'Fees', sourceFile: 'test.csv' },
      { id: 'tx-f2', date: '2026-10-15', description: 'Credit Card Late Fee', amount: 750, category: 'Fees', sourceFile: 'test.csv' },
    ];

    const leaks = runLeakDetectionAgent(transactions);
    const feeLeaks = leaks.filter(l => l.type === 'avoidable_fee');

    expect(feeLeaks.length).toBeGreaterThan(0);
    expect(feeLeaks.some(f => f.detectionReason.toLowerCase().includes('fee') || f.detectionReason.toLowerCase().includes('penalty'))).toBe(true);
  });

  it('detects high-frequency food delivery surges (Swiggy / Zomato)', () => {
    const transactions: Transaction[] = [
      { id: 'tx-s1', date: '2026-10-01', description: 'Swiggy Order #1', amount: 550, category: 'Food', sourceFile: 'test.csv' },
      { id: 'tx-s2', date: '2026-10-03', description: 'Zomato Delivery', amount: 620, category: 'Food', sourceFile: 'test.csv' },
      { id: 'tx-s3', date: '2026-10-06', description: 'Swiggy Order #2', amount: 480, category: 'Food', sourceFile: 'test.csv' },
      { id: 'tx-s4', date: '2026-10-10', description: 'Swiggy Dinner', amount: 700, category: 'Food', sourceFile: 'test.csv' },
      { id: 'tx-s5', date: '2026-10-14', description: 'Zomato Late Night', amount: 650, category: 'Food', sourceFile: 'test.csv' },
    ];

    const leaks = runLeakDetectionAgent(transactions);
    const deliveryLeak = leaks.find(l => l.category === 'Food');

    expect(deliveryLeak).toBeDefined();
    expect(deliveryLeak?.type).toBe('discretionary_spike');
    expect(deliveryLeak?.transactionIds.length).toBe(5);
  });

  it('never falsely flags essential income, salary, or internal bank transfers as spending leaks', () => {
    const transactions: Transaction[] = [
      { id: 'tx-inc', date: '2026-10-01', description: 'Monthly Tech Salary Credit', amount: 85000, category: 'Salary', sourceFile: 'test.csv' },
      { id: 'tx-trf', date: '2026-10-02', description: 'Self Transfer to Savings', amount: 20000, category: 'Miscellaneous', sourceFile: 'test.csv' },
      { id: 'tx-util', date: '2026-10-04', description: 'BESCOM Electricity Bill', amount: 1400, category: 'Utilities', sourceFile: 'test.csv' },
    ];

    const leaks = runLeakDetectionAgent(transactions);
    expect(leaks.length).toBe(0);
  });
});

describe('Agent 2 — Savings Opportunity Analyzer', () => {
  it('calculates conservative, realistic, and maximum savings without double-counting', () => {
    const transactions: Transaction[] = [
      { id: 'tx-1', date: '2026-10-01', description: 'Gym Subscription Cult', amount: 2000, category: 'Fitness', sourceFile: 'test.csv' },
      { id: 'tx-2', date: '2026-10-02', description: 'ATM Surcharge Penalty', amount: 200, category: 'Fees', sourceFile: 'test.csv' },
    ];

    const leaks = runLeakDetectionAgent(transactions);
    const analysis = runSavingsOpportunityAnalyzer(leaks);

    expect(analysis.totalAvoidableSpendMonthly).toBe(2200);
    // 50% on subscription (1000) + 100% on fee (200) = 1200
    expect(analysis.totalRealisticMonthlySavings).toBe(1200);
    expect(analysis.totalEstimatedAnnualSavings).toBe(1200 * 12);
    expect(analysis.totalConservativeMonthlySavings).toBeLessThanOrEqual(analysis.totalRealisticMonthlySavings);
    expect(analysis.totalMaxMonthlySavings).toBeGreaterThanOrEqual(analysis.totalRealisticMonthlySavings);
  });

  it('distinguishes estimated savings from confirmed or addressed savings', () => {
    const transactions: Transaction[] = [
      { id: 'tx-1', date: '2026-10-01', description: 'Amazon Prime Membership', amount: 1499, category: 'Entertainment', sourceFile: 'test.csv' },
      { id: 'tx-2', date: '2026-10-02', description: 'Overdraft Late Fee', amount: 300, category: 'Fees', sourceFile: 'test.csv' },
    ];

    const leaks = runLeakDetectionAgent(transactions);
    expect(leaks.length).toBeGreaterThan(0);
    const firstLeakId = leaks[0].id;

    // User marked first leak as 'addressed'
    const savedState = {
      [firstLeakId]: { status: 'addressed' as const }
    };

    const analysis = runSavingsOpportunityAnalyzer(leaks, savedState);

    expect(analysis.confirmedSavingsAccumulated).toBeGreaterThan(0);
    expect(analysis.opportunities.find(o => o.leakId === firstLeakId)?.status).toBe('addressed');
  });

  it('respects user-customized savings reduction percentages', () => {
    const transactions: Transaction[] = [
      { id: 'tx-sw1', date: '2026-10-01', description: 'Swiggy', amount: 1000, category: 'Food', sourceFile: 'test.csv' },
      { id: 'tx-sw2', date: '2026-10-05', description: 'Swiggy', amount: 1000, category: 'Food', sourceFile: 'test.csv' },
      { id: 'tx-sw3', date: '2026-10-10', description: 'Swiggy', amount: 1000, category: 'Food', sourceFile: 'test.csv' },
      { id: 'tx-sw4', date: '2026-10-15', description: 'Swiggy', amount: 1000, category: 'Food', sourceFile: 'test.csv' },
    ];

    const leaks = runLeakDetectionAgent(transactions);
    expect(leaks.length).toBeGreaterThan(0);
    const leakId = leaks[0].id;

    // User customized target reduction to 20% instead of default 40%
    const savedState = {
      [leakId]: { status: 'accepted' as const, customPercent: 20 }
    };

    const analysis = runSavingsOpportunityAnalyzer(leaks, savedState);
    const opportunity = analysis.opportunities.find(o => o.leakId === leakId);

    expect(opportunity?.realisticReductionTargetPercent).toBe(20);
    expect(opportunity?.realisticMonthlySavings).toBe(4000 * 0.20);
  });
});

describe('Agent 3 — WealthPilot Investment Guidance Agent', () => {
  it('correctly calculates SIP future-value compound projections with standard formula', () => {
    // 5000/month for 5 years at 12% p.a.
    // 5 years = 60 months
    const fv = calculateFutureValueMonthlySIP(5000, 12, 5);
    const totalInvested = 5000 * 60; // 300,000

    expect(totalInvested).toBe(300000);
    expect(fv).toBeGreaterThan(totalInvested);
    expect(fv).toBeGreaterThan(400000);
  });

  it('prioritizes Tier 1 Emergency Reserve when user has less than 3 months buffer', () => {
    const profile = {
      monthlyExpenses: 45000,
      monthlyDiscretionarySpending: 15000,
      emergencyFundMonthsAvailable: 0.67, // Under 3 months
      hasHighInterestDebt: false,
      debtMonthlyObligation: 0,
      riskTolerance: 'aggressive' as const,
      timeHorizon: 'long' as const,
      primaryGoal: 'emergency_buffer' as const
    };

    const destinations = runWealthPilotGuidanceAgent(5000, profile);
    expect(destinations.length).toBeGreaterThan(0);

    const emergencyDest = destinations.find(d => d.tier === 1);
    expect(emergencyDest).toBeDefined();
    expect(emergencyDest?.categoryName).toContain('Emergency Reserve');
    expect(emergencyDest?.suitabilityExplanation).toContain('emergency');
  });

  it('prioritizes Tier 2 High-Interest Debt Prepayment when user has outstanding expensive debt', () => {
    const profile = {
      monthlyExpenses: 35000,
      monthlyDiscretionarySpending: 10000,
      emergencyFundMonthsAvailable: 6, // Safe emergency buffer
      hasHighInterestDebt: true, // Outstanding debt!
      debtMonthlyObligation: 8500,
      riskTolerance: 'moderate' as const,
      timeHorizon: 'medium' as const,
      primaryGoal: 'debt_paydown' as const
    };

    const destinations = runWealthPilotGuidanceAgent(4000, profile);
    const debtPriority = destinations.find(d => d.tier === 2);

    expect(debtPriority).toBeDefined();
    expect(debtPriority?.categoryName).toContain('Debt Prepayment');
    expect(debtPriority?.suitabilityExplanation.toLowerCase()).toContain('paying down');
  });

  it('recommends broad-market index fund SIPs for long-term horizons with safe emergency reserves', () => {
    const profile = {
      monthlyExpenses: 35000,
      monthlyDiscretionarySpending: 10000,
      emergencyFundMonthsAvailable: 6,
      hasHighInterestDebt: false,
      debtMonthlyObligation: 0,
      riskTolerance: 'moderate' as const,
      timeHorizon: 'long' as const,
      primaryGoal: 'wealth_accumulation' as const
    };

    const destinations = runWealthPilotGuidanceAgent(5000, profile);
    const equityDestination = destinations.find(d => d.categoryName.includes('Index'));

    expect(equityDestination).toBeDefined();
    expect(equityDestination?.estimatedFutureValues.year5).toBeGreaterThan(0);
    expect(equityDestination?.taxConsiderations).toContain('LTCG');
  });
});

describe('Agent 4 — Financial Safety and Validation Agent', () => {
  it('emits a critical safety warning when emergency fund is under 3 months', () => {
    const profile = {
      monthlyExpenses: 35000,
      monthlyDiscretionarySpending: 10000,
      emergencyFundMonthsAvailable: 0.8,
      hasHighInterestDebt: false,
      debtMonthlyObligation: 0,
      riskTolerance: 'moderate' as const,
      timeHorizon: 'medium' as const,
      primaryGoal: 'emergency_buffer' as const
    };

    const destinations = runWealthPilotGuidanceAgent(3000, profile);
    const audit = runFinancialSafetyAgent([], destinations, profile, 3000);

    const emergencyCheck = audit.checks.find(c => c.id === 'safety-emergency-reserves');
    expect(emergencyCheck?.passed).toBe(false);
    expect(emergencyCheck?.severity).toBe('critical');
    expect(audit.disclaimer).toBeDefined();
  });

  it('flags realistic warnings when high-interest debt is active', () => {
    const profile = {
      monthlyExpenses: 35000,
      monthlyDiscretionarySpending: 10000,
      emergencyFundMonthsAvailable: 4,
      hasHighInterestDebt: true,
      debtMonthlyObligation: 5000,
      riskTolerance: 'moderate' as const,
      timeHorizon: 'medium' as const,
      primaryGoal: 'debt_paydown' as const
    };

    const destinations = runWealthPilotGuidanceAgent(3000, profile);
    const audit = runFinancialSafetyAgent([], destinations, profile, 3000);

    const debtCheck = audit.checks.find(c => c.id === 'safety-debt-obligations');
    expect(debtCheck?.passed).toBe(false);
    expect(debtCheck?.severity).toBe('critical');
  });
});

describe('WealthPilot Multi-Agent Orchestrator', () => {
  it('runs complete multi-agent workflow smoothly on sample user transactions', () => {
    const transactions: Transaction[] = [
      { id: '1', date: '2026-10-01', description: 'Swiggy Food', amount: 650, category: 'Food', sourceFile: 'test.csv' },
      { id: '2', date: '2026-10-03', description: 'Zomato Meals', amount: 550, category: 'Food', sourceFile: 'test.csv' },
      { id: '3', date: '2026-10-05', description: 'Swiggy Snacks', amount: 480, category: 'Food', sourceFile: 'test.csv' },
      { id: '4', date: '2026-10-08', description: 'Swiggy Dinner', amount: 720, category: 'Food', sourceFile: 'test.csv' },
      { id: '5', date: '2026-10-02', description: 'Netflix Subscription', amount: 649, category: 'Entertainment', sourceFile: 'test.csv' },
      { id: '6', date: '2026-10-04', description: 'Spotify India Subscription', amount: 129, category: 'Entertainment', sourceFile: 'test.csv' },
      { id: '7', date: '2026-10-09', description: 'ATM Surcharge Fee', amount: 50, category: 'Fees', sourceFile: 'test.csv' },
    ];

    const report = runWealthPilotWorkflow({
      transactions,
      totalBalance: 75000,
      monthlySpending: 15000,
      customProfileOverrides: {
        riskTolerance: 'moderate',
        timeHorizon: 'long'
      }
    });

    expect(report.detectedLeaks.length).toBeGreaterThan(0);
    expect(report.totalAvoidableSpend).toBeGreaterThan(0);
    expect(report.estimatedMonthlySavings).toBeGreaterThan(0);
    expect(report.estimatedAnnualSavings).toBe(report.estimatedMonthlySavings * 12);
    expect(report.destinations.length).toBeGreaterThan(0);
    expect(report.safetyAudit.disclaimer).toBeDefined();
    expect(report.generatedAt).toBeDefined();
  });

  it('handles empty transaction datasets without crashing or throwing NaN values', () => {
    const report = runWealthPilotWorkflow({
      transactions: [],
      totalBalance: 0,
      monthlySpending: 0
    });

    expect(report.detectedLeaks.length).toBe(0);
    expect(report.totalAvoidableSpend).toBe(0);
    expect(report.estimatedMonthlySavings).toBe(0);
    expect(report.estimatedAnnualSavings).toBe(0);
    expect(report.destinations.length).toBe(0);
    expect(report.safetyAudit.primaryPriority).toBe('emergency_savings');
  });
});
