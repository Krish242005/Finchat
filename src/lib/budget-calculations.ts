import type { Transaction } from './types';

export const DEFAULT_BUDGETS: Record<string, number> = {
  'Food': 15000,
  'Rent': 45000,
  'EMI': 25000,
  'Travel': 10000,
  'Shopping': 8000,
  'Utilities': 5000,
  'Healthcare': 10000,
  'Education': 15000,
  'Investment': 20000,
  'Entertainment': 10000,
  'Miscellaneous': 10000
};

export const CATEGORY_COLOR_MAP: Record<string, string> = {
  'Food': '#10B981',           // Emerald Green
  'Rent': '#4F46E5',           // Deep Indigo
  'EMI': '#F97316',            // Vivid Orange
  'Travel': '#06B6D4',         // Cyan / Sky Blue
  'Shopping': '#EC4899',       // Hot Pink
  'Utilities': '#EAB308',      // Vivid Yellow
  'Healthcare': '#14B8A6',     // Mint Teal
  'Education': '#8B5CF6',      // Electric Violet
  'Entertainment': '#D946EF',  // Magenta / Fuchsia
  'Investment': '#2563EB',     // Royal Blue
  'Personal Care': '#F43F5E',  // Coral Rose
  'Salary': '#22C55E',         // Bright Green
  'Miscellaneous': '#64748B'   // Slate Gray
};

/**
 * Returns a distinct, high-contrast color for any category.
 * Known categories use semantic colors; novel categories use golden-ratio hue distribution.
 */
export function getDistinctCategoryColor(categoryName: string, index = 0): string {
  const normalized = normalizeCategory(categoryName);
  if (CATEGORY_COLOR_MAP[normalized]) {
    return CATEGORY_COLOR_MAP[normalized];
  }
  if (CATEGORY_COLOR_MAP[categoryName]) {
    return CATEGORY_COLOR_MAP[categoryName];
  }

  // Golden ratio angle distribution for guaranteed perceptual contrast between any adjacent categories
  const goldenRatio = 0.618033988749895;
  const hue = Math.round(((index * goldenRatio) % 1) * 360);
  return `hsl(${hue}, 80%, 48%)`;
}

export interface CategoryBudgetAnalysis {
  name: string;
  spent: number;
  budget: number;
  remaining: number;
  breach: number;
  status: 'Within limit' | 'Exceeded';
  percent: number;
}

export interface GuardianInsightResult {
  insight: string;
  insightType: 'alert' | 'healthy' | 'normal';
  breachedCategories: CategoryBudgetAnalysis[];
  topCategory?: CategoryBudgetAnalysis;
}

/**
 * Direct category alias lookup table (all keys lowercase & trimmed)
 */
const CATEGORY_ALIASES: Record<string, string> = {
  // Food & Dining aliases
  'food': 'Food',
  'dining': 'Food',
  'food & dining': 'Food',
  'food and dining': 'Food',
  'food & beverages': 'Food',
  'food and beverages': 'Food',
  'f&b': 'Food',
  'groceries': 'Food',
  'grocery': 'Food',
  'supermarket': 'Food',
  'restaurants': 'Food',
  'restaurant': 'Food',
  'cafe': 'Food',
  'cafeteria': 'Food',
  'swiggy': 'Food',
  'zomato': 'Food',
  'eats': 'Food',
  'fast food': 'Food',
  'bakery': 'Food',
  'food delivery': 'Food',
  'dining out': 'Food',

  // Shopping aliases
  'shopping': 'Shopping',
  'shopping & retail': 'Shopping',
  'shopping and retail': 'Shopping',
  'retail': 'Shopping',
  'clothing': 'Shopping',
  'fashion': 'Shopping',
  'apparel': 'Shopping',
  'amazon': 'Shopping',
  'flipkart': 'Shopping',
  'myntra': 'Shopping',
  'store': 'Shopping',
  'electronics': 'Shopping',
  'gadgets': 'Shopping',
  'mall': 'Shopping',

  // Travel & Transportation aliases
  'travel': 'Travel',
  'travel & transport': 'Travel',
  'travel and transport': 'Travel',
  'transport': 'Travel',
  'transportation': 'Travel',
  'transit': 'Travel',
  'uber': 'Travel',
  'ola': 'Travel',
  'rapido': 'Travel',
  'cab': 'Travel',
  'taxi': 'Travel',
  'fuel': 'Travel',
  'petrol': 'Travel',
  'diesel': 'Travel',
  'gas': 'Travel',
  'flight': 'Travel',
  'airline': 'Travel',
  'train': 'Travel',
  'irctc': 'Travel',
  'metro': 'Travel',
  'bus': 'Travel',
  'commute': 'Travel',
  'toll': 'Travel',
  'parking': 'Travel',

  // Rent & Housing aliases
  'rent': 'Rent',
  'housing': 'Rent',
  'lease': 'Rent',
  'accommodation': 'Rent',
  'house rent': 'Rent',
  'flat rent': 'Rent',
  'maintenance': 'Rent',
  'society maintenance': 'Rent',

  // EMI & Loans aliases
  'emi': 'EMI',
  'loan': 'EMI',
  'mortgage': 'EMI',
  'debt': 'EMI',
  'equated monthly installment': 'EMI',
  'home loan': 'EMI',
  'car loan': 'EMI',
  'personal loan': 'EMI',
  'credit card payment': 'EMI',
  'credit card bill': 'EMI',
  'credit card': 'EMI',

  // Utilities & Bills aliases
  'utilities': 'Utilities',
  'utility': 'Utilities',
  'bills': 'Utilities',
  'bill': 'Utilities',
  'electricity': 'Utilities',
  'power': 'Utilities',
  'wifi': 'Utilities',
  'broadband': 'Utilities',
  'internet': 'Utilities',
  'mobile': 'Utilities',
  'phone': 'Utilities',
  'cellular': 'Utilities',
  'recharge': 'Utilities',
  'water': 'Utilities',
  'gas bill': 'Utilities',
  'lpg': 'Utilities',
  'dth': 'Utilities',
  'cable': 'Utilities',

  // Healthcare & Medical aliases
  'healthcare': 'Healthcare',
  'health': 'Healthcare',
  'medical': 'Healthcare',
  'medicine': 'Healthcare',
  'medicines': 'Healthcare',
  'pharmacy': 'Healthcare',
  'chemist': 'Healthcare',
  'doctor': 'Healthcare',
  'hospital': 'Healthcare',
  'clinic': 'Healthcare',
  'diagnostic': 'Healthcare',
  'dental': 'Healthcare',
  'gym': 'Healthcare',
  'fitness': 'Healthcare',

  // Education & Learning aliases
  'education': 'Education',
  'tuition': 'Education',
  'school': 'Education',
  'college': 'Education',
  'university': 'Education',
  'course': 'Education',
  'books': 'Education',
  'stationery': 'Education',
  'stationary': 'Education',
  'training': 'Education',
  'exam fee': 'Education',

  // Entertainment & Leisure aliases
  'entertainment': 'Entertainment',
  'leisure': 'Entertainment',
  'movies': 'Entertainment',
  'cinema': 'Entertainment',
  'theatre': 'Entertainment',
  'theater': 'Entertainment',
  'netflix': 'Entertainment',
  'spotify': 'Entertainment',
  'hotstar': 'Entertainment',
  'prime video': 'Entertainment',
  'youtube': 'Entertainment',
  'gaming': 'Entertainment',
  'concert': 'Entertainment',
  'subscription': 'Entertainment',
  'subscriptions': 'Entertainment',

  // Investments & Wealth aliases
  'investment': 'Investment',
  'investments': 'Investment',
  'stocks': 'Investment',
  'mutual fund': 'Investment',
  'mutual funds': 'Investment',
  'sip': 'Investment',
  'zerodha': 'Investment',
  'groww': 'Investment',
  'upstox': 'Investment',
  'shares': 'Investment',
  'equity': 'Investment',
  'crypto': 'Investment',
  'gold': 'Investment',
  'ppf': 'Investment',
  'nps': 'Investment',
  'fixed deposit': 'Investment',
  'fd': 'Investment',
  'rd': 'Investment',

  // Income / Salary aliases
  'salary': 'Salary',
  'income': 'Salary',
  'payroll': 'Salary',
  'stipend': 'Salary',
  'bonus': 'Salary',
  'freelance': 'Salary',
  'dividend': 'Salary',
  'refund': 'Salary',
  'cashback': 'Salary',
  'reimbursement': 'Salary',

  // Fallback
  'miscellaneous': 'Miscellaneous',
  'other': 'Miscellaneous',
  'others': 'Miscellaneous',
  'general': 'Miscellaneous'
};

/**
 * Normalizes any category string into a standardized canonical category.
 * Also inspects description keywords if category is missing or ambiguous.
 */
export function normalizeCategory(rawCategory?: string, description?: string): string {
  const cleanCat = (rawCategory || '').trim();
  const lowerCat = cleanCat.toLowerCase();

  // 1. Exact alias match
  if (lowerCat && CATEGORY_ALIASES[lowerCat]) {
    return CATEGORY_ALIASES[lowerCat];
  }

  // 2. Sanitized string match (e.g. "Food / Dining" or "Food & Dining" or "Food-Dining")
  const sanitized = lowerCat
    .replace(/[&/\\#,+()$~%.'":*?<>{}-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (sanitized && CATEGORY_ALIASES[sanitized]) {
    return CATEGORY_ALIASES[sanitized];
  }

  // 3. Pattern / Substring matching for category
  if (lowerCat.includes('food') || lowerCat.includes('dining') || lowerCat.includes('grocer') || lowerCat.includes('restaurant') || lowerCat.includes('swiggy') || lowerCat.includes('zomato')) {
    return 'Food';
  }
  if (lowerCat.includes('shop') || lowerCat.includes('cloth') || lowerCat.includes('fashion') || lowerCat.includes('retail') || lowerCat.includes('amazon') || lowerCat.includes('flipkart') || lowerCat.includes('myntra')) {
    return 'Shopping';
  }
  if (lowerCat.includes('travel') || lowerCat.includes('transit') || lowerCat.includes('transport') || lowerCat.includes('fuel') || lowerCat.includes('petrol') || lowerCat.includes('uber') || lowerCat.includes('ola') || lowerCat.includes('flight')) {
    return 'Travel';
  }
  if (lowerCat.includes('rent') || lowerCat.includes('lease') || lowerCat.includes('housing')) {
    return 'Rent';
  }
  if (lowerCat.includes('emi') || lowerCat.includes('loan') || lowerCat.includes('mortgage') || lowerCat.includes('credit card')) {
    return 'EMI';
  }
  if (lowerCat.includes('utilit') || lowerCat.includes('electric') || lowerCat.includes('power') || lowerCat.includes('wifi') || lowerCat.includes('broadband') || lowerCat.includes('recharge') || lowerCat.includes('water') || lowerCat.includes('bill')) {
    return 'Utilities';
  }
  if (lowerCat.includes('health') || lowerCat.includes('medic') || lowerCat.includes('pharm') || lowerCat.includes('doctor') || lowerCat.includes('hospital') || lowerCat.includes('clinic')) {
    return 'Healthcare';
  }
  if (lowerCat.includes('educat') || lowerCat.includes('tuition') || lowerCat.includes('school') || lowerCat.includes('college') || lowerCat.includes('university') || lowerCat.includes('book')) {
    return 'Education';
  }
  if (lowerCat.includes('entertain') || lowerCat.includes('movie') || lowerCat.includes('cinema') || lowerCat.includes('netflix') || lowerCat.includes('spotify') || lowerCat.includes('gaming')) {
    return 'Entertainment';
  }
  if (lowerCat.includes('invest') || lowerCat.includes('mutual fund') || lowerCat.includes('stock') || lowerCat.includes('zerodha') || lowerCat.includes('groww') || lowerCat.includes('sip')) {
    return 'Investment';
  }
  if (lowerCat.includes('salary') || lowerCat.includes('payroll') || lowerCat.includes('stipend') || lowerCat.includes('refund') || lowerCat.includes('cashback')) {
    return 'Salary';
  }

  // 4. Description fallback if category was empty or generic Miscellaneous
  if ((!cleanCat || lowerCat === 'miscellaneous' || lowerCat === 'other') && description) {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('swiggy') || lowerDesc.includes('zomato') || lowerDesc.includes('restaurant') || lowerDesc.includes('supermarket') || lowerDesc.includes('grocery') || lowerDesc.includes('cafe') || lowerDesc.includes('bakery')) {
      return 'Food';
    }
    if (lowerDesc.includes('amazon') || lowerDesc.includes('flipkart') || lowerDesc.includes('myntra') || lowerDesc.includes('clothing') || lowerDesc.includes('apparel')) {
      return 'Shopping';
    }
    if (lowerDesc.includes('uber') || lowerDesc.includes('ola') || lowerDesc.includes('rapido') || lowerDesc.includes('petrol') || lowerDesc.includes('fuel') || lowerDesc.includes('irctc') || lowerDesc.includes('flight')) {
      return 'Travel';
    }
    if (lowerDesc.includes('rent') || lowerDesc.includes('landlord')) {
      return 'Rent';
    }
    if (lowerDesc.includes('emi') || lowerDesc.includes('loan payment') || lowerDesc.includes('credit card bill') || lowerDesc.includes('credit card payment')) {
      return 'EMI';
    }
    if (lowerDesc.includes('electricity') || lowerDesc.includes('broadband') || lowerDesc.includes('wifi') || lowerDesc.includes('recharge') || lowerDesc.includes('airtel') || lowerDesc.includes('jio')) {
      return 'Utilities';
    }
    if (lowerDesc.includes('pharmacy') || lowerDesc.includes('apollo') || lowerDesc.includes('hospital') || lowerDesc.includes('clinic') || lowerDesc.includes('medplus')) {
      return 'Healthcare';
    }
    if (lowerDesc.includes('tuition') || lowerDesc.includes('school fee') || lowerDesc.includes('course fee')) {
      return 'Education';
    }
    if (lowerDesc.includes('netflix') || lowerDesc.includes('spotify') || lowerDesc.includes('bookmyshow') || lowerDesc.includes('pvr') || lowerDesc.includes('inox')) {
      return 'Entertainment';
    }
    if (lowerDesc.includes('zerodha') || lowerDesc.includes('groww') || lowerDesc.includes('mutual fund') || lowerDesc.includes('sip') || lowerDesc.includes('stocks')) {
      return 'Investment';
    }
    if (lowerDesc.includes('salary') || lowerDesc.includes('payroll') || lowerDesc.includes('stipend') || lowerDesc.includes('refund') || lowerDesc.includes('cashback')) {
      return 'Salary';
    }
  }

  // 5. Title-case the original if non-empty, otherwise 'Miscellaneous'
  if (cleanCat && cleanCat.length > 0) {
    return cleanCat.charAt(0).toUpperCase() + cleanCat.slice(1);
  }

  return 'Miscellaneous';
}

/**
 * Determines if a transaction is an eligible expense for budget & spending calculations.
 * Excludes credits (income/salary/refunds) and internal transfers.
 */
export function isEligibleExpense(tx: { amount: number; category?: string; description?: string }): boolean {
  // 1. Negative amounts are credits / income
  if (tx.amount <= 0) {
    return false;
  }

  const category = normalizeCategory(tx.category, tx.description);

  // 2. Income/Salary category is never an expense
  if (category === 'Salary') {
    return false;
  }

  const desc = (tx.description || '').toLowerCase();

  // 3. Exclude internal transfers (self transfer, account to account)
  const isTransfer = /self transfer|transfer to self|transfer to own|transfer between accounts|account to account|own account transfer|to own a\/c|from own a\/c/i.test(desc);
  if (isTransfer) {
    return false;
  }

  // 4. Exclude clear credit descriptions if amount was accidentally recorded positive
  const isCreditKeyword = /salary credited|payroll credit|interest credited|refund credited|cashback credited|dividend credited/i.test(desc);
  if (isCreditKeyword) {
    return false;
  }

  return true;
}

/**
 * Deduplicate transactions to avoid aggregate inflation from multiple uploads or chunk reads.
 */
export function deduplicateTransactions(transactions: Transaction[]): Transaction[] {
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  const deduplicated: Transaction[] = [];

  for (const tx of transactions) {
    // Check chunk ID if present
    if (tx.id && seenIds.has(tx.id)) {
      continue;
    }

    // Check content fingerprint
    const fingerprint = `${(tx.date || '').trim()}|${(tx.description || '').trim().toLowerCase()}|${tx.amount}|${normalizeCategory(tx.category, tx.description)}|${(tx.sourceFile || '').trim()}`;
    if (seenFingerprints.has(fingerprint)) {
      continue;
    }

    if (tx.id) seenIds.add(tx.id);
    seenFingerprints.add(fingerprint);
    deduplicated.push(tx);
  }

  return deduplicated;
}

const MONTH_NAMES_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12'
};

/**
 * Normalizes any arbitrary date string into canonical YYYY-MM-DD format.
 * Supports DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD-MMM-YYYY, ISO strings, etc.
 */
export function normalizeDateToISO(input: string | Date | undefined | null): string {
  if (!input) return '';
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return '';
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, '0');
    const d = String(input.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // ISO with timestamp: 2026-10-23T...
  if (trimmed.includes('T')) {
    const [datePart] = trimmed.split('T');
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // YYYY/MM/DD or YYYY-M-D or YYYY.MM.DD
  const yyyyFirst = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (yyyyFirst) {
    const [, y, m, d] = yyyyFirst;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD-MMM-YYYY or DD MMM YYYY (e.g. 15-May-2026, 15 May 2026, 04-Oct-26)
  const ddMmmYyyy = trimmed.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,4})[-/\s](\d{2,4})$/);
  if (ddMmmYyyy) {
    const [, d, mStr, rawYear] = ddMmmYyyy;
    const m = MONTH_NAMES_MAP[mStr.toLowerCase()];
    if (m) {
      const y = rawYear.length === 2 ? `20${rawYear}` : rawYear;
      return `${y}-${m}-${d.padStart(2, '0')}`;
    }
  }

  // MMM DD, YYYY (e.g. May 15, 2026 or October 23, 2026)
  const mmmDdYyyy = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (mmmDdYyyy) {
    const [, mStr, d, y] = mmmDdYyyy;
    const m = MONTH_NAMES_MAP[mStr.slice(0, 3).toLowerCase()];
    if (m) {
      return `${y}-${m}-${d.padStart(2, '0')}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY or DD.MM.YYYY
  const partsMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (partsMatch) {
    const [, p1, p2, rawYear] = partsMatch;
    const y = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    const num1 = parseInt(p1, 10);
    const num2 = parseInt(p2, 10);

    // If p1 > 12, it must be DD/MM/YYYY
    if (num1 > 12 && num2 <= 12) {
      return `${y}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
    }
    // If p2 > 12, it must be MM/DD/YYYY
    if (num2 > 12 && num1 <= 12) {
      return `${y}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
    }
    // Default to Indian/International standard DD/MM/YYYY
    return `${y}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
  }

  // Fallback to JS Date if valid
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
}

/**
 * Filter transactions by date range with full format normalization.
 */
export function filterTransactionsByDateRange(
  transactions: Transaction[],
  dateRange?: { from?: Date | string | null; to?: Date | string | null }
): Transaction[] {
  if (!dateRange?.from) {
    return transactions;
  }

  const startDateStr = normalizeDateToISO(dateRange.from);
  if (!startDateStr) return transactions;

  const endDateStr = dateRange.to ? normalizeDateToISO(dateRange.to) : startDateStr;

  return transactions.filter(tx => {
    if (!tx.date) return false;
    const txDateStr = normalizeDateToISO(tx.date);
    if (!txDateStr) return false;
    return txDateStr >= startDateStr && txDateStr <= (endDateStr || startDateStr);
  });
}

export interface MonthlySpendingData {
  name: string;
  spent: number;
  monthKey: string;
}

/**
 * Groups transactions by month strictly based on the dates present in the uploaded data.
 * Displays only months present in the data, in chronological order.
 */
export function calculateMonthlySpendingTrends(transactions: Transaction[]): MonthlySpendingData[] {
  const monthMap: Record<string, { label: string; year: string; spent: number; timestamp: number }> = {};

  transactions.forEach(tx => {
    if (isEligibleExpense(tx)) {
      const isoDate = normalizeDateToISO(tx.date);
      if (isoDate) {
        const [yearStr, monthStr] = isoDate.split('-');
        const yearMonthKey = `${yearStr}-${monthStr}`;
        const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
        const monthLabel = dateObj.toLocaleString('en-US', { month: 'short' });

        if (!monthMap[yearMonthKey]) {
          monthMap[yearMonthKey] = {
            label: monthLabel,
            year: yearStr,
            spent: 0,
            timestamp: dateObj.getTime()
          };
        }
        monthMap[yearMonthKey].spent += tx.amount;
      }
    }
  });

  const keys = Object.keys(monthMap).sort();
  if (keys.length === 0) {
    return [{ name: 'No Data', spent: 0, monthKey: '' }];
  }

  const years = new Set(keys.map(k => k.split('-')[0]));
  const showYear = years.size > 1;

  return keys.map(k => {
    const item = monthMap[k];
    const name = showYear ? `${item.label} '${item.year.slice(2, 4)}` : item.label;
    return {
      name,
      spent: Math.round(item.spent),
      monthKey: k
    };
  });
}

/**
 * Computes earliest and latest transaction date from transactions to auto-configure date range
 */
export function calculateDatasetDateBounds(transactions: Transaction[]): { from: Date; to: Date } | undefined {
  const validDates: Date[] = [];
  transactions.forEach(tx => {
    const iso = normalizeDateToISO(tx.date);
    if (iso) {
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (!isNaN(dt.getTime())) {
        validDates.push(dt);
      }
    }
  });

  if (validDates.length === 0) return undefined;

  validDates.sort((a, b) => a.getTime() - b.getTime());
  return {
    from: validDates[0],
    to: validDates[validDates.length - 1]
  };
}

/**
 * Core mathematical budget calculation for a single category
 * - Remaining budget = budget limit − eligible spending
 * - Budget breach = max(0, eligible spending − budget limit)
 * - Status = 'Within limit' when spending is <= limit; otherwise 'Exceeded'
 * - Does not report breach when spending is below or equal to limit
 */
export function calculateBudgetBreach(spent: number, limit: number): {
  remaining: number;
  breach: number;
  status: 'Within limit' | 'Exceeded';
  percent: number;
} {
  const roundedSpent = Math.round(spent);
  const roundedLimit = Math.round(limit);

  const remaining = roundedLimit - roundedSpent;
  const breach = Math.max(0, roundedSpent - roundedLimit);
  const status: 'Within limit' | 'Exceeded' = roundedSpent <= roundedLimit ? 'Within limit' : 'Exceeded';
  const percent = roundedLimit > 0 ? Math.round((roundedSpent / roundedLimit) * 100) : 0;

  return {
    remaining,
    breach,
    status,
    percent
  };
}

/**
 * Unified calculation source for all budget progress, limit analysis, and alerts.
 */
export function calculateCategoryBudgetProgress(
  transactions: Transaction[],
  customBudgets: Record<string, number> = DEFAULT_BUDGETS
): {
  budgetProgress: CategoryBudgetAnalysis[];
  categorySpendingMap: Record<string, number>;
  totalEligibleSpending: number;
} {
  const mergedBudgets = { ...DEFAULT_BUDGETS, ...customBudgets };
  const categorySpendingMap: Record<string, number> = {};
  let totalEligibleSpending = 0;

  for (const tx of transactions) {
    if (isEligibleExpense(tx)) {
      const normCat = normalizeCategory(tx.category, tx.description);
      categorySpendingMap[normCat] = (categorySpendingMap[normCat] || 0) + tx.amount;
      totalEligibleSpending += tx.amount;
    }
  }

  // Combine configured budget categories with any categories that have active spending
  const allCategoryNames = Array.from(
    new Set([...Object.keys(mergedBudgets), ...Object.keys(categorySpendingMap)])
  );

  const budgetProgress: CategoryBudgetAnalysis[] = allCategoryNames.map(name => {
    const spent = Math.round(categorySpendingMap[name] || 0);
    const budget = Math.round(mergedBudgets[name] || 10000);
    const { remaining, breach, status, percent } = calculateBudgetBreach(spent, budget);

    return {
      name,
      spent,
      budget,
      remaining,
      breach,
      status,
      percent
    };
  });

  // Sort: Breached categories first, then by spent descending
  budgetProgress.sort((a, b) => {
    if (a.status === 'Exceeded' && b.status !== 'Exceeded') return -1;
    if (b.status === 'Exceeded' && a.status !== 'Exceeded') return 1;
    if (a.breach !== b.breach) return b.breach - a.breach;
    return b.spent - a.spent;
  });

  return {
    budgetProgress,
    categorySpendingMap,
    totalEligibleSpending: Math.round(totalEligibleSpending)
  };
}

/**
 * Generates consistent Guardian Insight based directly on shared budget progress calculations.
 */
export function generateGuardianInsight({
  budgetProgress,
  totalSpent,
  totalTransactionsCount
}: {
  budgetProgress: CategoryBudgetAnalysis[];
  totalSpent: number;
  totalTransactionsCount: number;
}): GuardianInsightResult {
  if (totalTransactionsCount === 0) {
    return {
      insight: '"Upload bank statements or CSV files in Ledger Docs to activate real-time guardian intelligence."',
      insightType: 'normal',
      breachedCategories: []
    };
  }

  // Check for categories with budget breach (status === 'Exceeded' and breach > 0)
  const breachedCategories = budgetProgress.filter(item => item.status === 'Exceeded' && item.breach > 0);

  if (breachedCategories.length > 0) {
    const topBreach = breachedCategories[0];
    return {
      insight: `"Budget limit breached in '${topBreach.name}' by ₹${topBreach.breach.toLocaleString('en-IN')}. Tighten limits to protect your targets."`,
      insightType: 'alert',
      breachedCategories,
      topCategory: topBreach
    };
  }

  // Spending is within limit
  const activeCategories = budgetProgress.filter(item => item.spent > 0).sort((a, b) => b.spent - a.spent);

  if (activeCategories.length > 0) {
    const topCat = activeCategories[0];
    return {
      insight: `"${topCat.name} accounts for your highest expenditure at ₹${topCat.spent.toLocaleString('en-IN')}. Overall spending is well managed within all guardrail limits."`,
      insightType: 'healthy',
      breachedCategories: [],
      topCategory: topCat
    };
  }

  return {
    insight: '"All expense categories are currently within healthy guardrail limits."',
    insightType: 'healthy',
    breachedCategories: []
  };
}

export interface LimitAnalysisSummary {
  hasBreach: boolean;
  breachedCategories: CategoryBudgetAnalysis[];
  topBreach?: CategoryBudgetAnalysis;
  whereBreachedText: string;
  recommendation: string;
  buttonLabel: string;
  actionQuery: string;
}

/**
 * Generates actionable breach analysis, focusing on WHERE the breach occurred
 * and providing specific financial recommendations to recover.
 */
export function generateLimitAnalysisRecommendation(
  budgetProgress: CategoryBudgetAnalysis[],
  totalTransactionsCount = 0
): LimitAnalysisSummary {
  if (totalTransactionsCount === 0 || budgetProgress.length === 0) {
    return {
      hasBreach: false,
      breachedCategories: [],
      whereBreachedText: 'No transactions logged in this selected period.',
      recommendation: 'Upload bank statements or CSV logs to detect where expenses are trending against your limits.',
      buttonLabel: 'Analyze Items',
      actionQuery: 'Analyze my spending in detail. Which specific items caused budget breaches?'
    };
  }

  const breached = budgetProgress
    .filter(item => item.status === 'Exceeded' && item.breach > 0)
    .sort((a, b) => b.breach - a.breach);

  if (breached.length > 0) {
    const topBreach = breached[0];
    const totalBreach = breached.reduce((sum, item) => sum + item.breach, 0);

    let whereBreachedText: string;
    if (breached.length === 1) {
      whereBreachedText = `Breached in ${topBreach.name} by ₹${topBreach.breach.toLocaleString('en-IN')} (Spent ₹${topBreach.spent.toLocaleString('en-IN')} vs Limit ₹${topBreach.budget.toLocaleString('en-IN')}).`;
    } else {
      const breakdown = breached.map(b => `${b.name} (+₹${b.breach.toLocaleString('en-IN')})`).join(', ');
      whereBreachedText = `Breached in ${breached.length} categories: ${breakdown}. Total overrun: ₹${totalBreach.toLocaleString('en-IN')}.`;
    }

    // Category-specific high impact recommendations
    let recommendation: string;
    const normName = topBreach.name.toLowerCase();
    const dailyRecovery = Math.max(50, Math.ceil(topBreach.breach / 10));

    if (normName.includes('food')) {
      recommendation = `Recommendation: Cut dining out & food deliveries by ~₹${dailyRecovery.toLocaleString('en-IN')}/day over the next 10 days, prioritizing groceries to recover your ₹${topBreach.breach.toLocaleString('en-IN')} deficit.`;
    } else if (normName.includes('shop')) {
      recommendation = `Recommendation: Institute an immediate 14-day freeze on non-essential retail purchases and cancel pending cart checkouts to halt the ₹${topBreach.breach.toLocaleString('en-IN')} breach.`;
    } else if (normName.includes('travel')) {
      recommendation = `Recommendation: Switch to public transit, metro, or carpooling over on-demand premium cabs for the next 2 weeks to recover ₹${topBreach.breach.toLocaleString('en-IN')}.`;
    } else if (normName.includes('entertainment')) {
      recommendation = `Recommendation: Pause leisure outings and audit active streaming/app subscriptions to recover the ₹${topBreach.breach.toLocaleString('en-IN')} overage.`;
    } else if (normName.includes('rent') || normName.includes('emi') || normName.includes('util')) {
      recommendation = `Recommendation: Fixed obligations exceeded target by ₹${topBreach.breach.toLocaleString('en-IN')}. Reallocate ₹${topBreach.breach.toLocaleString('en-IN')} surplus from discretionary categories to balance accounts.`;
    } else {
      recommendation = `Recommendation: Trim daily discretionary spending by ₹${dailyRecovery.toLocaleString('en-IN')}/day across non-essential categories to absorb the ₹${topBreach.breach.toLocaleString('en-IN')} breach.`;
    }

    if (breached.length > 1) {
      recommendation += ` Focus first on ${topBreach.name}, which represents ${Math.round((topBreach.breach / totalBreach) * 100)}% of your total overrun.`;
    }

    return {
      hasBreach: true,
      breachedCategories: breached,
      topBreach,
      whereBreachedText,
      recommendation,
      buttonLabel: `Analyze ${topBreach.name} Breach`,
      actionQuery: `Focus on where my budget is breached: I breached my limit in ${topBreach.name} by ₹${topBreach.breach.toLocaleString('en-IN')} (Spent ₹${topBreach.spent.toLocaleString('en-IN')} vs Limit ₹${topBreach.budget.toLocaleString('en-IN')}). Pinpoint the exact transactions and items that caused this breach, and give me a step-by-step recovery recommendation.`
    };
  }

  // No breaches: all categories are within limit
  const activeCategories = budgetProgress.filter(item => item.spent > 0).sort((a, b) => b.spent - a.spent);
  const totalRemaining = budgetProgress.reduce((sum, item) => sum + Math.max(0, item.remaining), 0);

  if (activeCategories.length > 0) {
    const topCat = activeCategories[0];
    return {
      hasBreach: false,
      breachedCategories: [],
      whereBreachedText: `All limits healthy. Highest expenditure is in ${topCat.name} at ₹${topCat.spent.toLocaleString('en-IN')} (₹${topCat.remaining.toLocaleString('en-IN')} remaining of ₹${topCat.budget.toLocaleString('en-IN')} limit).`,
      recommendation: `Recommendation: You have ₹${totalRemaining.toLocaleString('en-IN')} in remaining budget surplus. Channel this surplus into emergency funds or investments before the cycle closes.`,
      buttonLabel: 'Review Spending Health',
      actionQuery: `All my budget limits are currently healthy. Review my spending in detail and give me recommendations on how to allocate remaining budget surplus into savings or investments.`
    };
  }

  return {
    hasBreach: false,
    breachedCategories: [],
    whereBreachedText: 'All spending categories are currently within healthy guardrail limits.',
    recommendation: 'Recommendation: Maintain your current spending discipline and allocate unused limits toward high-yield savings.',
    buttonLabel: 'Analyze Spending',
    actionQuery: 'Analyze my spending patterns and recommend opportunities for higher savings.'
  };
}

