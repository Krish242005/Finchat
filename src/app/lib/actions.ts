'use server';

import { chatWithFinancialData } from '@/ai/flows/chat-with-financial-data';
import type { RelevantChunk } from '@/lib/types';
import type { CategoryBudgetAnalysis } from '@/lib/budget-calculations';

export async function askFinancialQuestion(
  query: string, 
  context: RelevantChunk[],
  customBudgets?: Record<string, number>,
  budgetAnalysis?: CategoryBudgetAnalysis[]
) {
  const response = await chatWithFinancialData({
    userQuery: query,
    relevantChunks: context,
    customBudgets,
    budgetAnalysis
  });

  return response;
}
