'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { DateRange } from 'react-day-picker';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import type { Transaction } from '@/lib/types';
import { parseCSVLine } from '@/lib/utils';
import {
  DEFAULT_BUDGETS,
  CategoryBudgetAnalysis,
  GuardianInsightResult,
  LimitAnalysisSummary,
  normalizeCategory,
  isEligibleExpense,
  deduplicateTransactions,
  filterTransactionsByDateRange,
  calculateCategoryBudgetProgress,
  generateGuardianInsight,
  generateLimitAnalysisRecommendation,
  getDistinctCategoryColor,
  calculateMonthlySpendingTrends,
  calculateDatasetDateBounds,
  normalizeDateToISO
} from '@/lib/budget-calculations';

interface FinancialDataContextType {
  allTransactions: Transaction[];
  activeTransactions: Transaction[];
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  customBudgets: Record<string, number>;
  updateBudgets: (updated: Record<string, number>) => Promise<void>;
  budgetProgress: CategoryBudgetAnalysis[];
  guardianInsight: GuardianInsightResult;
  limitAnalysis: LimitAnalysisSummary;
  categorySpendingMap: Record<string, number>;
  stats: {
    totalBalance: number;
    monthlySpending: number;
    savingsRate: number;
    projectedTax: number;
  };
  chartData: { name: string; spent: number }[];
  categoryData: { name: string; value: number; color: string }[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

export function FinancialDataProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const db = useFirestore();

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [customBudgets, setCustomBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const hasUserManuallySelectedRange = React.useRef(false);

  const handleSetDateRange = useCallback((range: DateRange | undefined) => {
    hasUserManuallySelectedRange.current = true;
    setDateRange(range);
  }, []);

  // Load custom budgets from localStorage and Firestore
  const loadCustomBudgets = useCallback(async () => {
    let initialBudgets = { ...DEFAULT_BUDGETS };

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('finchat_custom_budgets');
      if (stored) {
        try {
          initialBudgets = { ...initialBudgets, ...JSON.parse(stored) };
        } catch (e) {
          console.warn("Invalid localStorage budget JSON:", e);
        }
      }
    }

    if (user && db) {
      try {
        const budgetDoc = await getDoc(doc(db, 'users', user.uid, 'documents', 'settings_budgets'));
        if (budgetDoc.exists() && budgetDoc.data()?.budgets) {
          initialBudgets = { ...initialBudgets, ...budgetDoc.data().budgets };
        }
      } catch (err) {
        console.warn("Firestore custom budgets fetch warning:", err);
      }
    }

    setCustomBudgets(initialBudgets);
    return initialBudgets;
  }, [user, db]);

  // Load and parse all transactions from user documents
  const loadData = useCallback(async () => {
    if (!user || !db) {
      setAllTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      await loadCustomBudgets();

      const docsSnapshot = await getDocs(collection(db, 'users', user.uid, 'documents'));
      const extractedRaw: Transaction[] = [];

      for (const docSnap of docsSnapshot.docs) {
        // Skip settings document and failed documents
        if (docSnap.id === 'settings_budgets' || docSnap.data()?.status === 'failed') {
          continue;
        }

        const chunksSnapshot = await getDocs(
          collection(db, 'users', user.uid, 'documents', docSnap.id, 'chunks')
        );

        chunksSnapshot.forEach(chunk => {
          const data = chunk.data();
          const rawText = data.chunkText || '';
          const parsed = parseCSVLine(rawText);

          const amt = (data.amount !== undefined && !isNaN(Number(data.amount)) && Number(data.amount) !== 0)
            ? Number(data.amount)
            : parsed.amount;

          let desc = parsed.description;
          if (!desc || /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(desc) || desc.startsWith('TXN-')) {
            const parts = rawText.split(',');
            desc = parts.find((p: string) => p.trim() && !/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(p.trim()) && !p.trim().startsWith('TXN-'))?.trim() || 'Financial Transaction';
          }

          const rawDate = data.transactionDate || parsed.date;
          const dateStr = normalizeDateToISO(rawDate) || rawDate;

          const rawCat = data.category && data.category !== 'Miscellaneous' ? data.category : parsed.category;
          const canonicalCat = normalizeCategory(rawCat, desc);

          extractedRaw.push({
            id: chunk.id,
            date: dateStr,
            description: desc,
            amount: amt,
            category: canonicalCat,
            sourceFile: docSnap.data()?.filename || 'Document'
          });
        });
      }

      const deduplicated = deduplicateTransactions(extractedRaw);
      const sorted = deduplicated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllTransactions(sorted);

      // Auto-align date range to the actual dates present in the uploaded dataset if not manually set
      if (!hasUserManuallySelectedRange.current) {
        const bounds = calculateDatasetDateBounds(sorted);
        if (bounds) {
          setDateRange(bounds);
        }
      }

    } catch (err) {
      console.error("Error loading financial data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, db, loadCustomBudgets]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update custom budgets in both state, localStorage, and Firestore
  const updateBudgets = useCallback(async (updated: Record<string, number>) => {
    const merged = { ...customBudgets, ...updated };
    setCustomBudgets(merged);

    if (typeof window !== 'undefined') {
      localStorage.setItem('finchat_custom_budgets', JSON.stringify(merged));
    }

    if (user && db) {
      try {
        const docRef = doc(db, 'users', user.uid, 'documents', 'settings_budgets');
        await setDoc(docRef, {
          id: 'settings_budgets',
          userId: user.uid,
          filename: 'Budget Guardrails Config',
          fileType: 'SETTINGS',
          budgets: merged,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("Firestore budget update error:", err);
      }
    }
  }, [customBudgets, user, db]);

  // Filter transactions by selected dateRange
  const activeTransactions = useMemo(() => {
    return filterTransactionsByDateRange(allTransactions, dateRange);
  }, [allTransactions, dateRange]);

  // Core calculations derived from activeTransactions and customBudgets
  const { budgetProgress, categorySpendingMap, totalEligibleSpending } = useMemo(() => {
    return calculateCategoryBudgetProgress(activeTransactions, customBudgets);
  }, [activeTransactions, customBudgets]);

  // Guardian Insight generated directly from shared budgetProgress and totalEligibleSpending
  const guardianInsight = useMemo(() => {
    return generateGuardianInsight({
      budgetProgress,
      totalSpent: totalEligibleSpending,
      totalTransactionsCount: activeTransactions.length
    });
  }, [budgetProgress, totalEligibleSpending, activeTransactions.length]);

  // Actionable limit breach analysis and recommendations
  const limitAnalysis = useMemo(() => {
    return generateLimitAnalysisRecommendation(budgetProgress, activeTransactions.length);
  }, [budgetProgress, activeTransactions.length]);

  // High-level KPI Stats
  const stats = useMemo(() => {
    const totalSpent = totalEligibleSpending;
    const totalIncome = activeTransactions.reduce((acc, tx) => {
      if (tx.amount < 0) return acc + Math.abs(tx.amount);
      if (normalizeCategory(tx.category, tx.description) === 'Salary') return acc + tx.amount;
      return acc;
    }, 0);

    const calculatedBalance = totalIncome > 0 ? Math.max(0, totalIncome - totalSpent) : Math.max(0, totalSpent);
    const savingsRate = totalIncome > 0
      ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalSpent) / totalIncome) * 100)))
      : 0;
    const projectedTax = Math.round(totalIncome * 0.15);

    return {
      totalBalance: calculatedBalance,
      monthlySpending: totalSpent,
      savingsRate,
      projectedTax
    };
  }, [activeTransactions, totalEligibleSpending]);

  // Spending Trends Bar Chart Data: displays each month present in the data chronologically
  const chartData = useMemo(() => {
    const txSource = activeTransactions.length > 0 ? activeTransactions : allTransactions;
    return calculateMonthlySpendingTrends(txSource);
  }, [activeTransactions, allTransactions]);

  // Category Distribution Pie Chart Data with distinct semantic & high-contrast colors
  const categoryData = useMemo(() => {
    return Object.entries(categorySpendingMap).map(([name, value], i) => ({
      name,
      value: Math.round(value),
      color: getDistinctCategoryColor(name, i)
    }));
  }, [categorySpendingMap]);

  // Dynamic budgets covering default categories plus any custom limits and any new categories from uploaded records
  const dynamicBudgets = useMemo(() => {
    const combined = { ...DEFAULT_BUDGETS, ...customBudgets };
    budgetProgress.forEach(b => {
      if (combined[b.name] === undefined) {
        combined[b.name] = b.budget;
      }
    });
    return combined;
  }, [customBudgets, budgetProgress]);

  const contextValue = useMemo(() => ({
    allTransactions,
    activeTransactions,
    dateRange,
    setDateRange: handleSetDateRange,
    customBudgets: dynamicBudgets,
    updateBudgets,
    budgetProgress,
    guardianInsight,
    limitAnalysis,
    categorySpendingMap,
    stats,
    chartData,
    categoryData,
    isLoading,
    refreshData: loadData
  }), [
    allTransactions,
    activeTransactions,
    dateRange,
    handleSetDateRange,
    dynamicBudgets,
    updateBudgets,
    budgetProgress,
    guardianInsight,
    limitAnalysis,
    categorySpendingMap,
    stats,
    chartData,
    categoryData,
    isLoading,
    loadData
  ]);

  return (
    <FinancialDataContext.Provider value={contextValue}>
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const context = useContext(FinancialDataContext);
  if (!context) {
    throw new Error('useFinancialData must be used within a FinancialDataProvider');
  }
  return context;
}
