import { describe, it, expect } from 'vitest';
import {
  calculateBudgetBreach,
  normalizeCategory,
  isEligibleExpense,
  calculateCategoryBudgetProgress,
  generateGuardianInsight,
  filterTransactionsByDateRange,
  deduplicateTransactions,
  DEFAULT_BUDGETS,
  getDistinctCategoryColor,
  generateLimitAnalysisRecommendation,
  normalizeDateToISO,
  calculateMonthlySpendingTrends,
  calculateDatasetDateBounds
} from './budget-calculations';
import type { Transaction } from './types';

describe('Budget Calculations & Limits (Requirement 9 & Core Formulas)', () => {
  it('Case 1: Limit ₹15,000, spending ₹6,300 → remaining ₹8,700; no breach (status: Within limit)', () => {
    const result = calculateBudgetBreach(6300, 15000);
    expect(result.remaining).toBe(8700);
    expect(result.breach).toBe(0);
    expect(result.status).toBe('Within limit');
    expect(result.percent).toBe(42);
  });

  it('Case 2: Limit ₹15,000, spending ₹24,330 → breach ₹9,330 (status: Exceeded)', () => {
    const result = calculateBudgetBreach(24330, 15000);
    expect(result.remaining).toBe(-9330);
    expect(result.breach).toBe(9330);
    expect(result.status).toBe('Exceeded');
    expect(result.percent).toBe(162);
  });

  it('Case 3: Limit ₹15,000, spending ₹15,000 → exactly at limit; no breach (status: Within limit)', () => {
    const result = calculateBudgetBreach(15000, 15000);
    expect(result.remaining).toBe(0);
    expect(result.breach).toBe(0);
    expect(result.status).toBe('Within limit');
    expect(result.percent).toBe(100);
  });

  it('handles arbitrary variable spending & limits without hardcoding', () => {
    const result1 = calculateBudgetBreach(12500, 10000);
    expect(result1.remaining).toBe(-2500);
    expect(result1.breach).toBe(2500);
    expect(result1.status).toBe('Exceeded');

    const result2 = calculateBudgetBreach(3000, 5000);
    expect(result2.remaining).toBe(2000);
    expect(result2.breach).toBe(0);
    expect(result2.status).toBe('Within limit');
  });
});

describe('Category Normalization (Requirement 2)', () => {
  it('normalizes "Food" and "Food & Dining" to the same canonical "Food" category', () => {
    expect(normalizeCategory('Food')).toBe('Food');
    expect(normalizeCategory('food')).toBe('Food');
    expect(normalizeCategory('Food & Dining')).toBe('Food');
    expect(normalizeCategory('food & dining')).toBe('Food');
    expect(normalizeCategory('Food and Dining')).toBe('Food');
    expect(normalizeCategory('dining')).toBe('Food');
    expect(normalizeCategory('groceries')).toBe('Food');
    expect(normalizeCategory('Restaurants')).toBe('Food');
    expect(normalizeCategory('Swiggy')).toBe('Food');
    expect(normalizeCategory('Zomato')).toBe('Food');
  });

  it('normalizes Shopping, Travel, Healthcare, Education, Utilities, Rent, EMI, Investment', () => {
    // Shopping
    expect(normalizeCategory('Shopping & Retail')).toBe('Shopping');
    expect(normalizeCategory('clothing')).toBe('Shopping');
    expect(normalizeCategory('amazon')).toBe('Shopping');

    // Travel
    expect(normalizeCategory('Travel & Transport')).toBe('Travel');
    expect(normalizeCategory('uber')).toBe('Travel');
    expect(normalizeCategory('fuel')).toBe('Travel');

    // Healthcare
    expect(normalizeCategory('health')).toBe('Healthcare');
    expect(normalizeCategory('pharmacy')).toBe('Healthcare');
    expect(normalizeCategory('medical expenses')).toBe('Healthcare');

    // Education
    expect(normalizeCategory('tuition')).toBe('Education');
    expect(normalizeCategory('school fee')).toBe('Education');

    // Utilities
    expect(normalizeCategory('electricity bill')).toBe('Utilities');
    expect(normalizeCategory('wifi recharge')).toBe('Utilities');

    // Rent & EMI
    expect(normalizeCategory('house rent')).toBe('Rent');
    expect(normalizeCategory('personal loan')).toBe('EMI');
    expect(normalizeCategory('credit card payment')).toBe('EMI');

    // Investment
    expect(normalizeCategory('mutual fund')).toBe('Investment');
    expect(normalizeCategory('sip')).toBe('Investment');
  });
});

describe('Eligible Spending & Credit/Transfer Filtering (Requirement 6)', () => {
  it('excludes credits (negative amounts or salary)', () => {
    expect(isEligibleExpense({ amount: -50000, category: 'Salary', description: 'Monthly Salary' })).toBe(false);
    expect(isEligibleExpense({ amount: 50000, category: 'Salary', description: 'Salary Credited' })).toBe(false);
    expect(isEligibleExpense({ amount: -500, category: 'Food', description: 'Refund' })).toBe(false);
  });

  it('excludes internal transfers', () => {
    expect(isEligibleExpense({ amount: 10000, category: 'Miscellaneous', description: 'Self Transfer to Savings' })).toBe(false);
    expect(isEligibleExpense({ amount: 5000, category: 'Miscellaneous', description: 'Transfer between accounts' })).toBe(false);
  });

  it('includes valid expenses', () => {
    expect(isEligibleExpense({ amount: 6300, category: 'Food & Dining', description: 'Supermarket and Dining' })).toBe(true);
    expect(isEligibleExpense({ amount: 25000, category: 'Rent', description: 'Monthly Flat Rent' })).toBe(true);
    expect(isEligibleExpense({ amount: 15000, category: 'EMI', description: 'Car Loan EMI' })).toBe(true);
  });
});

describe('Guardian Insight Consistency (Requirement 1, 4, 5)', () => {
  it('does NOT report a breach when spending is below or equal to limit', () => {
    const transactions: Transaction[] = [
      { id: '1', date: '2026-10-01', description: 'Groceries', amount: 6300, category: 'Food & Dining', sourceFile: 'test.csv' }
    ];
    const { budgetProgress, totalEligibleSpending } = calculateCategoryBudgetProgress(transactions, { Food: 15000 });
    
    const foodProgress = budgetProgress.find(b => b.name === 'Food');
    expect(foodProgress).toBeDefined();
    expect(foodProgress?.spent).toBe(6300);
    expect(foodProgress?.remaining).toBe(8700);
    expect(foodProgress?.breach).toBe(0);
    expect(foodProgress?.status).toBe('Within limit');

    const insight = generateGuardianInsight({
      budgetProgress,
      totalSpent: totalEligibleSpending,
      totalTransactionsCount: transactions.length
    });

    expect(insight.insightType).toBe('healthy');
    expect(insight.insight).not.toContain('breached');
    expect(insight.insight).toContain('Food accounts for your highest expenditure at ₹6,300');
  });

  it('reports breach accurately when spending exceeds limit', () => {
    const transactions: Transaction[] = [
      { id: '1', date: '2026-10-01', description: 'Fine Dining & Catering', amount: 24330, category: 'Food & Dining', sourceFile: 'test.csv' }
    ];
    const { budgetProgress, totalEligibleSpending } = calculateCategoryBudgetProgress(transactions, { Food: 15000 });
    
    const foodProgress = budgetProgress.find(b => b.name === 'Food');
    expect(foodProgress?.spent).toBe(24330);
    expect(foodProgress?.breach).toBe(9330);
    expect(foodProgress?.status).toBe('Exceeded');

    const insight = generateGuardianInsight({
      budgetProgress,
      totalSpent: totalEligibleSpending,
      totalTransactionsCount: transactions.length
    });

    expect(insight.insightType).toBe('alert');
    expect(insight.insight).toBe('"Budget limit breached in \'Food\' by ₹9,330. Tighten limits to protect your targets."');
  });
});

describe('Date Filtering & Deduplication (Requirement 3 & 8)', () => {
  const sampleTxs: Transaction[] = [
    { id: 't1', date: '2026-09-15', description: 'Dinner', amount: 18030, category: 'Food', sourceFile: 'stmt.csv' },
    { id: 't2', date: '2026-10-10', description: 'Groceries', amount: 6300, category: 'Food & Dining', sourceFile: 'stmt.csv' },
    { id: 't3', date: '2026-10-10', description: 'Groceries', amount: 6300, category: 'Food & Dining', sourceFile: 'stmt.csv' } // duplicate
  ];

  it('deduplicates duplicate transactions', () => {
    const deduped = deduplicateTransactions(sampleTxs);
    expect(deduped.length).toBe(2);
  });

  it('filters strictly by the specified date range', () => {
    const filtered = filterTransactionsByDateRange(sampleTxs, {
      from: new Date('2026-10-01'),
      to: new Date('2026-10-31')
    });
    expect(filtered.length).toBe(2); // t2 and t3 (October only)
    expect(filtered.every(t => t.date.startsWith('2026-10'))).toBe(true);
  });
});

describe('Logical Adaptation to Any Arbitrary File, Section & Custom Limits (Generalized System)', () => {
  it('dynamically adapts to arbitrary categories from newly uploaded files', () => {
    // Arbitrary new uploaded file with novel sections/categories
    const arbitraryFileTxs: Transaction[] = [
      { id: 'a1', date: '2026-11-05', description: 'AWS Cloud Hosting', amount: 3500, category: 'Software Infrastructure', sourceFile: 'q4_invoice.csv' },
      { id: 'a2', date: '2026-11-08', description: 'Vet checkup and vaccination', amount: 4800, category: 'Pet Care', sourceFile: 'q4_invoice.csv' },
      { id: 'a3', date: '2026-11-12', description: 'Dog food and toys', amount: 1200, category: 'Pet Care', sourceFile: 'q4_invoice.csv' }
    ];

    // User configured custom limits for these arbitrary categories
    const userCustomLimits = {
      'Software Infrastructure': 5000,
      'Pet Care': 4000
    };

    const { budgetProgress, categorySpendingMap, totalEligibleSpending } = calculateCategoryBudgetProgress(
      arbitraryFileTxs,
      userCustomLimits
    );

    expect(totalEligibleSpending).toBe(9500); // 3500 + 4800 + 1200

    // Software Infrastructure: 3500 spent vs 5000 limit -> within limit, remaining 1500
    const software = budgetProgress.find(b => b.name === 'Software Infrastructure');
    expect(software?.spent).toBe(3500);
    expect(software?.budget).toBe(5000);
    expect(software?.remaining).toBe(1500);
    expect(software?.breach).toBe(0);
    expect(software?.status).toBe('Within limit');

    // Pet Care: 6000 spent (4800 + 1200) vs 4000 limit -> exceeded, breach 2000
    const petCare = budgetProgress.find(b => b.name === 'Pet Care');
    expect(petCare?.spent).toBe(6000);
    expect(petCare?.budget).toBe(4000);
    expect(petCare?.remaining).toBe(-2000);
    expect(petCare?.breach).toBe(2000);
    expect(petCare?.status).toBe('Exceeded');

    // Guardian Insight automatically alerts on the dynamic breach
    const insight = generateGuardianInsight({
      budgetProgress,
      totalSpent: totalEligibleSpending,
      totalTransactionsCount: arbitraryFileTxs.length
    });

    expect(insight.insightType).toBe('alert');
    expect(insight.insight).toContain("Budget limit breached in 'Pet Care' by ₹2,000");
  });

  it('immediately adapts when user updates the limit for any category', () => {
    const arbitraryFileTxs: Transaction[] = [
      { id: 'p1', date: '2026-11-08', description: 'Vet Clinic', amount: 4800, category: 'Pet Care', sourceFile: 'pet_records.pdf' },
      { id: 'p2', date: '2026-11-12', description: 'Pet Supplies', amount: 1200, category: 'Pet Care', sourceFile: 'pet_records.pdf' }
    ];

    // Total spent is 6,000.
    // If limit is 5,000:
    const initialRun = calculateCategoryBudgetProgress(arbitraryFileTxs, { 'Pet Care': 5000 });
    const initialPet = initialRun.budgetProgress.find(b => b.name === 'Pet Care');
    expect(initialPet?.status).toBe('Exceeded');
    expect(initialPet?.breach).toBe(1000);

    // User updates limit to 7,000:
    const updatedRun = calculateCategoryBudgetProgress(arbitraryFileTxs, { 'Pet Care': 7000 });
    const updatedPet = updatedRun.budgetProgress.find(b => b.name === 'Pet Care');
    expect(updatedPet?.status).toBe('Within limit');
    expect(updatedPet?.breach).toBe(0);
    expect(updatedPet?.remaining).toBe(1000);

    // Guardian insight immediately switches to healthy
    const updatedInsight = generateGuardianInsight({
      budgetProgress: updatedRun.budgetProgress,
      totalSpent: updatedRun.totalEligibleSpending,
      totalTransactionsCount: arbitraryFileTxs.length
    });
    expect(updatedInsight.insightType).toBe('healthy');
    expect(updatedInsight.insight).toContain('Overall spending is well managed');
  });
});

describe('Category Color Logic for Donut Graph', () => {
  it('assigns unique, distinct colors for all standard categories', () => {
    const categories = [
      'Food',
      'Rent',
      'EMI',
      'Travel',
      'Shopping',
      'Utilities',
      'Healthcare',
      'Education',
      'Entertainment',
      'Investment',
      'Personal Care',
      'Miscellaneous'
    ];

    const colors = categories.map((cat, idx) => getDistinctCategoryColor(cat, idx));
    const uniqueColors = new Set(colors);

    // Every single standard category must have a distinct color
    expect(uniqueColors.size).toBe(categories.length);

    // Food should be green, not blue/purple
    expect(getDistinctCategoryColor('Food')).toBe('#10B981');
    expect(getDistinctCategoryColor('food & dining')).toBe('#10B981');
    // EMI should be orange
    expect(getDistinctCategoryColor('EMI')).toBe('#F97316');
  });

  it('assigns high-contrast colors via golden-ratio distribution for novel or unmapped categories', () => {
    const novel1 = getDistinctCategoryColor('Crypto Mining', 0);
    const novel2 = getDistinctCategoryColor('Space Travel', 1);
    const novel3 = getDistinctCategoryColor('Vintage Watches', 2);

    expect(novel1).not.toBe(novel2);
    expect(novel2).not.toBe(novel3);
    expect(novel1).toMatch(/^hsl\(\d+,\s*80%,\s*48%\)$/);
  });
});

describe('Limit Analysis Recommendations & Breach Focus (User Feature)', () => {
  it('identifies WHERE the breach occurred and provides specific food reduction recommendation', () => {
    const mockBudgetProgress = [
      {
        name: 'Food',
        spent: 16300,
        budget: 15000,
        remaining: -1300,
        breach: 1300,
        status: 'Exceeded' as const,
        percent: 109
      },
      {
        name: 'Rent',
        spent: 20000,
        budget: 45000,
        remaining: 25000,
        breach: 0,
        status: 'Within limit' as const,
        percent: 44
      }
    ];

    const result = generateLimitAnalysisRecommendation(mockBudgetProgress, 10);
    expect(result.hasBreach).toBe(true);
    // Explicitly states WHERE it is breached:
    expect(result.whereBreachedText).toContain('Breached in Food by ₹1,300');
    expect(result.whereBreachedText).toContain('Spent ₹16,300 vs Limit ₹15,000');
    // Provides actionable recommendation:
    expect(result.recommendation).toContain('Recommendation:');
    expect(result.recommendation).toContain('Cut dining out & food deliveries');
    expect(result.recommendation).toContain('₹1,300');
    // Provides direct action button and targeted chat query:
    expect(result.buttonLabel).toBe('Analyze Food Breach');
    expect(result.actionQuery).toContain('I breached my limit in Food by ₹1,300');
  });

  it('handles multiple breached categories and calculates total overrun', () => {
    const mockBudgetProgress = [
      {
        name: 'Food',
        spent: 17000,
        budget: 15000,
        remaining: -2000,
        breach: 2000,
        status: 'Exceeded' as const,
        percent: 113
      },
      {
        name: 'Shopping',
        spent: 9000,
        budget: 8000,
        remaining: -1000,
        breach: 1000,
        status: 'Exceeded' as const,
        percent: 113
      }
    ];

    const result = generateLimitAnalysisRecommendation(mockBudgetProgress, 12);
    expect(result.hasBreach).toBe(true);
    expect(result.whereBreachedText).toContain('Breached in 2 categories');
    expect(result.whereBreachedText).toContain('Food (+₹2,000)');
    expect(result.whereBreachedText).toContain('Shopping (+₹1,000)');
    expect(result.whereBreachedText).toContain('Total overrun: ₹3,000');
  });

  it('provides surplus reinvestment recommendation when no categories are breached', () => {
    const mockBudgetProgress = [
      {
        name: 'Food',
        spent: 6000,
        budget: 15000,
        remaining: 9000,
        breach: 0,
        status: 'Within limit' as const,
        percent: 40
      },
      {
        name: 'Rent',
        spent: 20000,
        budget: 45000,
        remaining: 25000,
        breach: 0,
        status: 'Within limit' as const,
        percent: 44
      }
    ];

    const result = generateLimitAnalysisRecommendation(mockBudgetProgress, 5);
    expect(result.hasBreach).toBe(false);
    expect(result.whereBreachedText).toContain('All limits healthy');
    expect(result.whereBreachedText).toContain('Rent at ₹20,000');
    expect(result.recommendation).toContain('Recommendation:');
    expect(result.recommendation).toContain('remaining budget surplus');
    expect(result.buttonLabel).toBe('Review Spending Health');
  });
});

describe('Date Normalization & Dynamic Monthly Spending Trends (Multi-Month Requirement)', () => {
  it('normalizes diverse date formats (DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY, YYYY-MM-DD)', () => {
    expect(normalizeDateToISO('15/06/2026')).toBe('2026-06-15');
    expect(normalizeDateToISO('23-09-2026')).toBe('2026-09-23');
    expect(normalizeDateToISO('12-May-2026')).toBe('2026-05-12');
    expect(normalizeDateToISO('2026-10-23')).toBe('2026-10-23');
    expect(normalizeDateToISO('01/03/2026')).toBe('2026-03-01');
    expect(normalizeDateToISO('2026/08/19')).toBe('2026-08-19');
    expect(normalizeDateToISO('2026-10-23T14:30:00Z')).toBe('2026-10-23');
  });

  it('displays exactly the 6 months present in uploaded data with individual monthly spending', () => {
    // Simulated multi-month file data spanning May through October
    const sixMonthsTransactions: Transaction[] = [
      { id: '1', date: '15/05/2026', description: 'Grocery May', amount: 12000, category: 'Food', sourceFile: 'Statement.csv' },
      { id: '2', date: '20-Jun-2026', description: 'Rent June', amount: 20000, category: 'Rent', sourceFile: 'Statement.csv' },
      { id: '3', date: '2026-07-10', description: 'Shopping July', amount: 7500, category: 'Shopping', sourceFile: 'Statement.csv' },
      { id: '4', date: '14/08/2026', description: 'Utilities Aug', amount: 4500, category: 'Utilities', sourceFile: 'Statement.csv' },
      { id: '5', date: '25-09-2026', description: 'Dining Sep', amount: 6300, category: 'Food', sourceFile: 'Statement.csv' },
      { id: '6', date: '2026-10-23', description: 'Groceries Oct', amount: 5000, category: 'Food', sourceFile: 'Statement.csv' }
    ];

    const monthlyTrends = calculateMonthlySpendingTrends(sixMonthsTransactions);

    // Exactly 6 months must appear:
    expect(monthlyTrends).toHaveLength(6);
    expect(monthlyTrends.map(m => m.name)).toEqual(['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);

    // Each month must have its individual spending, NOT clumped into one month:
    expect(monthlyTrends.find(m => m.name === 'May')?.spent).toBe(12000);
    expect(monthlyTrends.find(m => m.name === 'Jun')?.spent).toBe(20000);
    expect(monthlyTrends.find(m => m.name === 'Jul')?.spent).toBe(7500);
    expect(monthlyTrends.find(m => m.name === 'Aug')?.spent).toBe(4500);
    expect(monthlyTrends.find(m => m.name === 'Sep')?.spent).toBe(6300);
    expect(monthlyTrends.find(m => m.name === 'Oct')?.spent).toBe(5000);
  });

  it('makes absent months disappear and only shows months present in the uploaded file', () => {
    // Only 2 distinct months present: February and April
    const twoMonthsTransactions: Transaction[] = [
      { id: '1', date: '2026-02-14', description: 'Dinner', amount: 3000, category: 'Food', sourceFile: 'Feb_Apr.csv' },
      { id: '2', date: '2026-04-20', description: 'Electronics', amount: 15000, category: 'Shopping', sourceFile: 'Feb_Apr.csv' }
    ];

    const monthlyTrends = calculateMonthlySpendingTrends(twoMonthsTransactions);

    // Jan, Mar, May, etc. do NOT appear
    expect(monthlyTrends).toHaveLength(2);
    expect(monthlyTrends.map(m => m.name)).toEqual(['Feb', 'Apr']);
    expect(monthlyTrends.find(m => m.name === 'Feb')?.spent).toBe(3000);
    expect(monthlyTrends.find(m => m.name === 'Apr')?.spent).toBe(15000);
  });

  it('auto-computes date bounds encompassing all months in the dataset', () => {
    const multiMonthTransactions: Transaction[] = [
      { id: '1', date: '15/05/2026', description: 'First tx', amount: 100, category: 'Food', sourceFile: 'Stmt.csv' },
      { id: '2', date: '2026-10-23', description: 'Last tx', amount: 200, category: 'Food', sourceFile: 'Stmt.csv' }
    ];

    const bounds = calculateDatasetDateBounds(multiMonthTransactions);
    expect(bounds).toBeDefined();
    expect(normalizeDateToISO(bounds?.from)).toBe('2026-05-15');
    expect(normalizeDateToISO(bounds?.to)).toBe('2026-10-23');
  });
});



