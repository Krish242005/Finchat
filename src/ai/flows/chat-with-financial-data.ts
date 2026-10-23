'use server';

import OpenAI from 'openai';
import { z } from 'zod';
import { DEFAULT_BUDGETS } from '@/lib/budget-calculations';

const RelevantChunkSchema = z.object({
  text: z.string(),
  metadata: z.object({
    date: z.string(),
    category: z.string().optional(),
    amount: z.number().optional(),
    fileName: z.string(),
  }),
});

const BudgetStatusSchema = z.object({
  name: z.string(),
  spent: z.number(),
  budget: z.number(),
  remaining: z.number(),
  breach: z.number(),
  status: z.string(),
  percent: z.number()
});

const ChatWithFinancialDataInputSchema = z.object({
  userQuery: z.string(),
  relevantChunks: z.array(RelevantChunkSchema),
  customBudgets: z.record(z.string(), z.number()).optional(),
  budgetAnalysis: z.array(BudgetStatusSchema).optional(),
});

export type ChatWithFinancialDataInput = z.infer<typeof ChatWithFinancialDataInputSchema>;

export type ChatWithFinancialDataOutput = {
  answer: string;
};

export async function chatWithFinancialData(input: ChatWithFinancialDataInput): Promise<ChatWithFinancialDataOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      answer: "OPENAI_API_KEY is missing in environment variables. Please add OPENAI_API_KEY to your .env file."
    };
  }

  const openai = new OpenAI({ apiKey });

  const contextStr = (input.relevantChunks || []).map(chunk => {
    let details = `[Source: ${chunk.metadata?.fileName || 'Document'}] [Date: ${chunk.metadata?.date || 'Unknown'}]`;
    if (chunk.metadata?.category) details += ` [Category: ${chunk.metadata.category}]`;
    if (chunk.metadata?.amount !== undefined) details += ` [Amount: ₹${chunk.metadata.amount}]`;
    return `${details}\nContent: ${chunk.text}`;
  }).join('\n---\n');

  // Merge default budgets with user's active configured custom budgets
  const activeBudgets: Record<string, number> = {
    ...DEFAULT_BUDGETS,
    ...(input.customBudgets || {})
  };

  const budgetSummaryLines = Object.entries(activeBudgets).map(
    ([cat, limit]) => `- ${cat} Limit: ₹${limit.toLocaleString('en-IN')}`
  ).join('\n');

  const budgetAnalysisSection = input.budgetAnalysis && input.budgetAnalysis.length > 0
    ? `\n### REAL-TIME ACTIVE BUDGET STATUS (CALCULATED FROM USER'S RECORDS & ACTIVE LIMITS):\n${input.budgetAnalysis.map(a => 
        `- ${a.name}: Spent ₹${a.spent.toLocaleString('en-IN')} / Active Limit ₹${a.budget.toLocaleString('en-IN')} (Status: ${a.status}${a.breach > 0 ? `, Breached by ₹${a.breach.toLocaleString('en-IN')}` : `, Remaining ₹${a.remaining.toLocaleString('en-IN')}`})`
      ).join('\n')}`
    : '';

  const systemPrompt = `You are FinChat AI, an Elite Financial Guardian and Strategist. Your mission is to provide rigorous, data-driven analysis of the user's private financial data, always using Indian Rupees (₹) as the currency.

### DYNAMIC BUDGET GUARDRAILS:
The user has configured the following custom budget limits for their account:
${budgetSummaryLines}
${budgetAnalysisSection}

### MISSION-CRITICAL OPERATING DIRECTIVES:
1. **Dynamic Budget Enforcement:** You MUST evaluate budget compliance against the user's ACTIVE configured limits listed above. Never assume hardcoded defaults if the user has updated their limits (e.g., if Food limit is ₹5,000, evaluate against ₹5,000).
   - CRITICAL: Strictly treat 'Food and Dining', 'Food & Dining', and 'Food' as ONE and the same category: 'Food'. Never separate them or create a duplicate category.
   - If spending is less than or equal to the limit, confirm the status is "Within limit" and state the remaining budget amount. Do not report a breach if spending is within the limit.
   - If spending exceeds the limit, issue a strict professional warning stating the exact breached amount (Spent - Limit).
2. **Focus on WHERE it is breached:** When any limit is breached (or when asked about limit analysis), explicitly identify WHERE the breach occurred:
   - Name the exact category or categories that breached their limits.
   - State the exact breach amounts: "Breached in [Category] by ₹[Breach] (Spent ₹[Spent] of ₹[Limit])".
   - Dig into transaction records to pinpoint the exact line items, dates, and merchants/vendors (e.g. Swiggy, Zomato, Amazon, Uber, specific restaurants or bills) that pushed the category over its budget limit.
3. **Actionable Recommendations & Recovery:** Always give a clear, step-by-step recommendation on how to recover from the breach:
   - Provide concrete daily or weekly spending reduction targets in ₹ (e.g., "Cut food delivery by ₹150/day over the next 10 days to recover ₹1,500").
   - Suggest specific behavioral substitutions (e.g., cooking at home, freezing non-essential online retail purchases for 14 days, switching from premium cabs to transit).
   - Suggest surplus reallocations: identify healthy categories with remaining headroom to rebalance the budget.
4. **Calculated Accuracy:** Sum all amounts precisely. If a user asks "how much did I spend," provide a hard number calculated from the context in ₹.
5. **Persona:** You are an expert mentor. Be firm, analytical, and highly actionable. Your goal is the user's financial freedom.

### RESPONSE STRUCTURE & READABILITY STANDARDS (MANDATORY):
All outputs from you MUST be structured cleanly, scannable, and formatted for maximum readability. NEVER write unbroken walls of dense text. Always use this layout:

### 1. Executive Summary
- 1-2 crisp sentences stating the core answer with key figures in bold (e.g., "**Your spending is within limit with ₹8,700 surplus remaining**" or "**Budget limit breached in Food by ₹1,300 over the ₹5,000 target**").

### 2. Category & Budget Breakdown
- When evaluating spending, categories, or limits, ALWAYS provide a clean Markdown table:
| Category | Spent | Active Limit | Status | Variance |
|:---|:---|:---|:---|:---|
| Food | ₹6,300 | ₹5,000 | [Breached] | +₹1,300 overrun |

### 3. Root Cause & Line-Item Analysis
- Use structured bullet points detailing specific transactions, vendors, and dates that contributed to the totals:
  - **Date & Merchant**: Description — **₹Amount** ([Category])

### 4. Step-by-Step Action Plan
- Numbered actionable recommendations (1., 2., 3.) with exact daily/weekly target reduction numbers in ₹:
  1. **Immediate Step**: Target reduction in ₹ per day/week to balance the deficit.
  2. **Behavioral Substitution**: Meal prep, subscription pause, transit shift.
  3. **Reallocation**: Shift surplus from healthy categories to restore safety buffer.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `### YOUR SOURCE OF TRUTH (CONTEXT):\n${contextStr || 'No document context found.'}\n\n### USER QUERY:\n${input.userQuery}` }
      ]
    });

    const answer = response.choices[0]?.message?.content || "I couldn't generate an analysis from the provided data.";
    return { answer };
  } catch (error: any) {
    console.error("OpenAI chat error:", error);
    return {
      answer: `An error occurred while calling OpenAI (${error?.message || 'Unknown error'}). Please try again.`
    };
  }
}
