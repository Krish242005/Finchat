'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  ArrowRight, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Layers, 
  PiggyBank, 
  HelpCircle,
  Zap,
  Info
} from 'lucide-react';
import type { Transaction } from '@/lib/types';
import type { CategoryBudgetAnalysis } from '@/lib/budget-calculations';
import { generateLimitAnalysisRecommendation } from '@/lib/budget-calculations';
import { runWealthPilotWorkflow } from '@/lib/wealthpilot/orchestrator';
import { SavingsInvestmentOpportunitiesDialog } from './savings-investment-opportunities-dialog';

interface QuickActionsBoxProps {
  allTransactions: Transaction[];
  activeTransactions: Transaction[];
  budgetProgress: CategoryBudgetAnalysis[];
  stats: {
    totalBalance: number;
    monthlySpending: number;
    savingsRate: number;
    projectedTax: number;
  };
}

type QuickActionType = 'none' | 'limit_analysis' | 'leak_detection' | 'recovery_protocol';

export function QuickActionsBox({
  allTransactions,
  activeTransactions,
  budgetProgress,
  stats
}: QuickActionsBoxProps) {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<QuickActionType>('none');

  const transactions = activeTransactions.length > 0 ? activeTransactions : allTransactions;

  // 1. Limit Analysis computation
  const limitAnalysis = useMemo(() => {
    return generateLimitAnalysisRecommendation(budgetProgress, transactions.length);
  }, [budgetProgress, transactions.length]);

  const breachedCategories = useMemo(() => {
    return budgetProgress.filter(b => b.status === 'Exceeded' && b.breach > 0);
  }, [budgetProgress]);

  const totalBreachAmount = useMemo(() => {
    return breachedCategories.reduce((sum, b) => sum + b.breach, 0);
  }, [breachedCategories]);

  // 2. WealthPilot AI computation
  const wealthReport = useMemo(() => {
    return runWealthPilotWorkflow({
      transactions,
      totalBalance: stats.totalBalance,
      monthlySpending: stats.monthlySpending
    });
  }, [transactions, stats.totalBalance, stats.monthlySpending]);

  // 3. Recovery Protocol computation
  const recoveryPlan = useMemo(() => {
    const isExceeded = breachedCategories.length > 0;
    const topOverrun = breachedCategories[0];
    const dailyTrimTarget = topOverrun ? Math.max(100, Math.ceil(topOverrun.breach / 14)) : 250;
    
    return {
      isExceeded,
      deficit: totalBreachAmount,
      topCategory: topOverrun?.name || 'Discretionary',
      dailyTrimTarget,
      projectedRecoveryDays: isExceeded ? 14 : 0
    };
  }, [breachedCategories, totalBreachAmount]);

  return (
    <Card className="border border-border/80 shadow-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <CardHeader className="p-5 pb-4 border-b border-border/50 bg-slate-50/70 dark:bg-slate-800/40 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base md:text-lg font-black tracking-tight uppercase">Quick Actions</CardTitle>
              <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                AI Diagnostics
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground font-medium mt-0.5">
              Select an action to instantly run real-time financial intelligence and display actionable outputs.
            </CardDescription>
          </div>
        </div>

        {selectedAction !== 'none' && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedAction('none')}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* The 3 Quick Action Selector Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Limit Analysis */}
          <button
            type="button"
            onClick={() => setSelectedAction(selectedAction === 'limit_analysis' ? 'none' : 'limit_analysis')}
            className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden group ${
              selectedAction === 'limit_analysis'
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30'
                : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-border text-foreground'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className={`p-2 rounded-lg ${selectedAction === 'limit_analysis' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <Badge 
                variant="outline" 
                className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
                  selectedAction === 'limit_analysis'
                    ? 'border-white/30 text-white bg-white/10'
                    : breachedCategories.length > 0
                      ? 'border-red-300 text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300'
                      : 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}
              >
                {breachedCategories.length > 0 ? `${breachedCategories.length} Breached` : 'In Limit'}
              </Badge>
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-wide uppercase mb-1">Limit Analysis</h4>
              <p className={`text-xs leading-relaxed font-medium ${selectedAction === 'limit_analysis' ? 'text-blue-100' : 'text-muted-foreground'}`}>
                Deep-dive into specific items that caused your budget breaches this period.
              </p>
            </div>
            <div className={`mt-3 flex items-center gap-1.5 text-xs font-bold pt-2 border-t ${selectedAction === 'limit_analysis' ? 'border-white/20 text-white' : 'border-border/60 text-blue-600 dark:text-blue-400'}`}>
              <span>{selectedAction === 'limit_analysis' ? 'Viewing Output' : 'Run Analysis'}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* Option 2: Leak Detection */}
          <button
            type="button"
            onClick={() => setSelectedAction(selectedAction === 'leak_detection' ? 'none' : 'leak_detection')}
            className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden group ${
              selectedAction === 'leak_detection'
                ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/25 ring-2 ring-purple-500/30'
                : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-border text-foreground'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className={`p-2 rounded-lg ${selectedAction === 'leak_detection' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'}`}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <Badge 
                variant="outline" 
                className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
                  selectedAction === 'leak_detection'
                    ? 'border-white/30 text-white bg-white/10'
                    : 'border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300'
                }`}
              >
                WealthPilot AI
              </Badge>
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-wide uppercase mb-1">Leak Detection</h4>
              <p className={`text-xs leading-relaxed font-medium ${selectedAction === 'leak_detection' ? 'text-purple-100' : 'text-muted-foreground'}`}>
                Turn spending leaks into wealth-building opportunities. Analyze waste and invest surplus.
              </p>
            </div>
            <div className={`mt-3 flex items-center gap-1.5 text-xs font-bold pt-2 border-t ${selectedAction === 'leak_detection' ? 'border-white/20 text-white' : 'border-border/60 text-purple-600 dark:text-purple-400'}`}>
              <span>{selectedAction === 'leak_detection' ? 'Viewing Output' : 'Detect Leaks'}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* Option 3: Recovery Protocol */}
          <button
            type="button"
            onClick={() => setSelectedAction(selectedAction === 'recovery_protocol' ? 'none' : 'recovery_protocol')}
            className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden group ${
              selectedAction === 'recovery_protocol'
                ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-500/25 ring-2 ring-amber-500/30'
                : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-border text-foreground'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className={`p-2 rounded-lg ${selectedAction === 'recovery_protocol' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'}`}>
                <PieChartIcon className="w-5 h-5" />
              </div>
              <Badge 
                variant="outline" 
                className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
                  selectedAction === 'recovery_protocol'
                    ? 'border-white/30 text-white bg-white/10'
                    : 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                Protocol
              </Badge>
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-wide uppercase mb-1">Recovery Protocol</h4>
              <p className={`text-xs leading-relaxed font-medium ${selectedAction === 'recovery_protocol' ? 'text-amber-100' : 'text-muted-foreground'}`}>
                Exceeded your monthly targets? Generate a strict AI-powered recovery plan.
              </p>
            </div>
            <div className={`mt-3 flex items-center gap-1.5 text-xs font-bold pt-2 border-t ${selectedAction === 'recovery_protocol' ? 'border-white/20 text-white' : 'border-border/60 text-amber-600 dark:text-amber-400'}`}>
              <span>{selectedAction === 'recovery_protocol' ? 'Viewing Output' : 'Generate Plan'}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </div>

        {/* The Output Box */}
        <div className="rounded-xl border border-border bg-slate-50/80 dark:bg-slate-950/70 p-5 transition-all">
          {/* Output Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                {selectedAction === 'none' && 'Output: Ready for Analysis'}
                {selectedAction === 'limit_analysis' && 'Output: Limit Analysis Diagnostic'}
                {selectedAction === 'leak_detection' && 'Output: WealthPilot Leak & Savings Opportunity'}
                {selectedAction === 'recovery_protocol' && 'Output: Strict AI Recovery Plan'}
              </span>
            </div>
            {selectedAction !== 'none' && (
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Live Data Output
              </span>
            )}
          </div>

          {/* Condition 1: DEFAULT TEXT (Shown before any action is clicked) */}
          {selectedAction === 'none' && (
            <div className="py-6 px-4 text-center max-w-xl mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-inner">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Select a Quick Action to View Results</h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                Choose any of the 3 quick actions above to instantly view real-time analysis in this box. 
                Use <strong className="text-foreground">Limit Analysis</strong> to pinpoint specific items breaching your budget, 
                <strong className="text-foreground"> Leak Detection</strong> to uncover subscriptions and avoidable fees with WealthPilot AI, or 
                <strong className="text-foreground"> Recovery Protocol</strong> to get an actionable plan to bring your spending back under target.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-muted-foreground font-semibold">
                <span className="px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800">1. Select action</span>
                <span>→</span>
                <span className="px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800">2. View instant output</span>
                <span>→</span>
                <span className="px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800">3. Execute recommendations</span>
              </div>
            </div>
          )}

          {/* Condition 2: LIMIT ANALYSIS OUTPUT */}
          {selectedAction === 'limit_analysis' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                limitAnalysis.hasBreach
                  ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-200'
              }`}>
                <div className="flex items-start gap-3">
                  {limitAnalysis.hasBreach ? (
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-bold text-sm">
                      {limitAnalysis.hasBreach ? 'Budget Limits Breached' : 'All Categories Within Budget Limits'}
                    </h5>
                    <p className="text-xs font-medium opacity-90 mt-0.5">
                      {limitAnalysis.whereBreachedText}
                    </p>
                  </div>
                </div>
                {limitAnalysis.hasBreach && (
                  <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold shrink-0">
                    Total Overrun: ₹{totalBreachAmount.toLocaleString('en-IN')}
                  </Badge>
                )}
              </div>

              {/* Actionable Recommendation */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-border space-y-2">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">Actionable AI Recommendation</span>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  {limitAnalysis.recommendation}
                </p>
              </div>

              {/* Breached items list if available */}
              {breachedCategories.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Breach Breakdown by Category</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {breachedCategories.map(cat => (
                      <div key={cat.name} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-border flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-foreground block">{cat.name}</span>
                          <span className="text-[11px] text-muted-foreground">Spent ₹{cat.spent.toLocaleString('en-IN')} / ₹{cat.budget.toLocaleString('en-IN')}</span>
                        </div>
                        <Badge variant="destructive" className="font-bold text-[10px]">
                          +₹{cat.breach.toLocaleString('en-IN')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button 
                  size="sm" 
                  className="gap-2 text-xs font-bold"
                  onClick={() => router.push('/chat?q=' + encodeURIComponent(limitAnalysis.actionQuery))}
                >
                  <span>Analyze Items in Chat</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Condition 3: LEAK DETECTION OUTPUT (WealthPilot AI) */}
          {selectedAction === 'leak_detection' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Potentially Avoidable</span>
                  <span className="text-lg font-black text-foreground">₹{wealthReport.totalAvoidableSpend.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Monthly detected leaks</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Realistic Savings</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{wealthReport.estimatedMonthlySavings.toLocaleString('en-IN')}<span className="text-xs font-normal">/mo</span></span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Safe reduction target</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Annual Wealth Potential</span>
                  <span className="text-lg font-black text-primary">₹{wealthReport.estimatedAnnualSavings.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">If maintained for 12 mos</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Primary Recommendation</span>
                  <span className="text-xs font-bold text-foreground block truncate mt-1">
                    {wealthReport.destinations[0]?.categoryName || 'Emergency Reserve'}
                  </span>
                  <span className="text-[10px] text-muted-foreground block font-medium">
                    {wealthReport.destinations[0]?.riskLevel} Risk • {wealthReport.destinations[0]?.allocationPercentage}% split
                  </span>
                </div>
              </div>

              {/* Detected Leaks preview */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Top Detected Spending Leaks</span>
                {wealthReport.detectedLeaks.length > 0 ? (
                  <div className="space-y-2">
                    {wealthReport.detectedLeaks.slice(0, 3).map(leak => (
                      <div key={leak.id} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{leak.title}</span>
                            <Badge variant="secondary" className="text-[9px] uppercase px-1.5 py-0">
                              {leak.category}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-medium mt-0.5 line-clamp-1">
                            {leak.detectionReason}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-black text-red-600 dark:text-red-400">
                            ₹{leak.monthlyAmount.toLocaleString('en-IN')}/mo
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-border text-center text-xs text-muted-foreground">
                    No significant spending leaks detected in this period. Great budget discipline!
                  </div>
                )}
              </div>

              {/* Action bar: opens full WealthPilot dialog */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground font-medium">
                  Educational guidance only. Disclose all investment risks.
                </span>
                <SavingsInvestmentOpportunitiesDialog
                  trigger={
                    <Button size="sm" className="gap-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white">
                      <span>Open Full WealthPilot Agent</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  }
                />
              </div>
            </div>
          )}

          {/* Condition 4: RECOVERY PROTOCOL OUTPUT */}
          {selectedAction === 'recovery_protocol' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 shrink-0">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                      {recoveryPlan.isExceeded 
                        ? `Budget Overrun Active: ₹${recoveryPlan.deficit.toLocaleString('en-IN')} Deficit`
                        : 'Budget Balanced: Preventive Maintenance Plan'}
                    </h5>
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-1 leading-relaxed">
                      {recoveryPlan.isExceeded
                        ? `To recover your ₹${recoveryPlan.deficit.toLocaleString('en-IN')} overage within 14 days, reduce discretionary spending in ${recoveryPlan.topCategory} by ~₹${recoveryPlan.dailyTrimTarget.toLocaleString('en-IN')}/day.`
                        : 'Your spending is currently within target. Continue allocating 20% of income to savings and investments to maintain positive compounding.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Step Protocol */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-border space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                    <span className="text-xs font-bold text-foreground">Discretionary Freeze</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                    Pause non-essential food deliveries and online retail orders for the next 7-10 days.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-border space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                    <span className="text-xs font-bold text-foreground">Deficit Reallocation</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                    Shift ₹{Math.round(recoveryPlan.deficit * 0.5).toLocaleString('en-IN')} from unspent utility/travel buffers to balance the ledger.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-border space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
                    <span className="text-xs font-bold text-foreground">30-Day Reset</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                    Target a 15% minimum savings rate next month to replenish any withdrawn liquidity reserves.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button 
                  size="sm" 
                  className="gap-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => router.push('/chat?q=' + encodeURIComponent('I need a strict step-by-step recovery plan for my recent budget breach. Guide me through day-by-day spending limits.'))}
                >
                  <span>Launch Recovery Plan in AI Chat</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
