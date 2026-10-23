'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  PiggyBank,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Calculator,
  MessageSquare
} from 'lucide-react';
import { useFinancialData } from '@/context/financial-data-context';
import { runWealthPilotWorkflow } from '@/lib/wealthpilot/orchestrator';
import type { RiskTolerance, TimeHorizon, SavingsOpportunity, UserFinancialProfile } from '@/lib/wealthpilot/types';

interface SavingsInvestmentOpportunitiesDialogProps {
  trigger?: React.ReactNode;
}

export function SavingsInvestmentOpportunitiesDialog({ trigger }: SavingsInvestmentOpportunitiesDialogProps) {
  const router = useRouter();
  const { allTransactions, activeTransactions, stats } = useFinancialData();
  const [open, setOpen] = useState(false);

  // User adjustable profile parameters
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>('moderate');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('medium');
  const [emergencyBufferAdequate, setEmergencyBufferAdequate] = useState<boolean>(stats.totalBalance >= (stats.monthlySpending * 3));

  // Opportunities decision state: { [leakId]: { status: 'active' | 'accepted' | 'dismissed' | 'addressed', customPercent?: number } }
  const [opportunitiesState, setOpportunitiesState] = useState<Record<string, { status: 'active' | 'accepted' | 'dismissed' | 'addressed'; customPercent?: number }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('wealthpilot_opportunities_state');
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  const saveOpportunitiesState = (newState: Record<string, { status: 'active' | 'accepted' | 'dismissed' | 'addressed'; customPercent?: number }>) => {
    setOpportunitiesState(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wealthpilot_opportunities_state', JSON.stringify(newState));
    }
  };

  const handleUpdateOpportunityStatus = (leakId: string, status: 'active' | 'accepted' | 'dismissed' | 'addressed') => {
    const updated = {
      ...opportunitiesState,
      [leakId]: {
        ...(opportunitiesState[leakId] || {}),
        status
      }
    };
    saveOpportunitiesState(updated);
  };

  const handleUpdateOpportunityPercent = (leakId: string, percent: number) => {
    const updated = {
      ...opportunitiesState,
      [leakId]: {
        ...(opportunitiesState[leakId] || {}),
        status: opportunitiesState[leakId]?.status || 'accepted',
        customPercent: percent
      }
    };
    saveOpportunitiesState(updated);
  };

  // Run WealthPilot multi-agent workflow
  const report = useMemo(() => {
    const txSource = activeTransactions.length > 0 ? activeTransactions : allTransactions;
    return runWealthPilotWorkflow({
      transactions: txSource,
      totalBalance: stats.totalBalance,
      monthlySpending: stats.monthlySpending,
      customProfileOverrides: {
        riskTolerance,
        timeHorizon,
        emergencyFundMonthsAvailable: emergencyBufferAdequate ? 4 : Math.min(1.5, stats.totalBalance / (stats.monthlySpending || 1))
      },
      savedOpportunitiesState: opportunitiesState
    });
  }, [activeTransactions, allTransactions, stats, riskTolerance, timeHorizon, emergencyBufferAdequate, opportunitiesState]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="secondary" size="sm" className="w-full text-accent font-bold mt-auto gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Explore Opportunities</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 relative shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5">
              <Sparkles className="w-3 h-3 mr-1 inline" /> WealthPilot AI
            </Badge>
            <span className="text-xs text-indigo-200 font-medium">Multi-Agent Savings-to-Investment Engine</span>
          </div>

          <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center justify-between">
            Savings-to-Investment Opportunities
          </DialogTitle>
          <DialogDescription className="text-indigo-200 text-xs md:text-sm mt-1 max-w-2xl font-normal leading-relaxed">
            Turn spending leaks into wealth-building opportunities. Analyze avoidable spending, calibrate realistic savings targets, and channel surplus capital into transparent investment destinations.
          </DialogDescription>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-200 block">Avoidable Spend</span>
              <span className="text-lg md:text-xl font-black text-white">₹{report.totalAvoidableSpend.toLocaleString('en-IN')}<span className="text-xs font-normal opacity-70">/mo</span></span>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-sm p-3 rounded-xl border border-emerald-400/25">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200 block">Monthly Savings</span>
              <span className="text-lg md:text-xl font-black text-emerald-300">₹{report.estimatedMonthlySavings.toLocaleString('en-IN')}<span className="text-xs font-normal opacity-70">/mo</span></span>
            </div>
            <div className="bg-amber-500/20 backdrop-blur-sm p-3 rounded-xl border border-amber-400/25">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-200 block">Annual Potential</span>
              <span className="text-lg md:text-xl font-black text-amber-300">₹{report.estimatedAnnualSavings.toLocaleString('en-IN')}<span className="text-xs font-normal opacity-70">/yr</span></span>
            </div>
            <div className="bg-purple-500/20 backdrop-blur-sm p-3 rounded-xl border border-purple-400/25">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-200 block">Suggested Investment</span>
              <span className="text-lg md:text-xl font-black text-purple-300">₹{report.suggestedMonthlyInvestment.toLocaleString('en-IN')}<span className="text-xs font-normal opacity-70">/mo</span></span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <ScrollArea className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Important Distinction Banner */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 rounded-xl p-3.5 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              <strong className="font-bold">Essential Financial Distinction:</strong> Estimated savings targets are potential wealth-building opportunities calculated from your logs, not money already deposited in your account. Realizing these projections requires maintaining your chosen reductions over time.
            </div>
          </div>

          <Tabs defaultValue="opportunities" className="w-full">
            <TabsList className="grid grid-cols-3 mb-6 bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl">
              <TabsTrigger value="opportunities" className="font-bold text-xs md:text-sm">
                1. Detected Leaks ({report.opportunities.length})
              </TabsTrigger>
              <TabsTrigger value="destinations" className="font-bold text-xs md:text-sm">
                2. Wealth Destinations ({report.destinations.length})
              </TabsTrigger>
              <TabsTrigger value="safety" className="font-bold text-xs md:text-sm">
                3. Safety Audit & Profile
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Detected Opportunities */}
            <TabsContent value="opportunities" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Identified Spending Leaks & Targets</h3>
                  <p className="text-xs text-muted-foreground">Adjust target reduction percentages per leak to calibrate your monthly investment capacity.</p>
                </div>
                {report.confirmedSavingsAccumulated > 0 && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold text-xs">
                    ₹{report.confirmedSavingsAccumulated.toLocaleString('en-IN')} Confirmed Addressed
                  </Badge>
                )}
              </div>

              {report.opportunities.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-muted text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-sm text-foreground">No Significant Spending Leaks Detected</p>
                  <p className="text-xs mt-1">Your transaction records demonstrate disciplined spending without recurring subscriptions waste or unusual spikes.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.opportunities.map((opp) => {
                    const activePercent = opp.customReductionPercent !== undefined 
                      ? opp.customReductionPercent 
                      : opp.realisticReductionTargetPercent;
                    const isDismissed = opp.status === 'dismissed';
                    const isAddressed = opp.status === 'addressed';

                    return (
                      <Card key={opp.leakId} className={`border transition-all ${isDismissed ? 'opacity-50 bg-slate-100 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-900 shadow-sm'}`}>
                        <CardHeader className="pb-3 pt-4 px-4 md:px-6">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                                  {opp.category}
                                </Badge>
                                {isAddressed && (
                                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                    Addressed
                                  </Badge>
                                )}
                                {isDismissed && (
                                  <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                    Dismissed
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-base font-bold">{opp.leakTitle}</CardTitle>
                              <CardDescription className="text-xs mt-1 leading-relaxed">
                                {opp.explanation}
                              </CardDescription>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Monthly Leak</span>
                              <span className="text-base md:text-lg font-black text-rose-600">₹{opp.monthlySpend.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="px-4 md:px-6 pb-4 pt-0 space-y-4">
                          {/* Target Adjuster Slider */}
                          {!isDismissed && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-foreground flex items-center gap-1.5">
                                  <Calculator className="w-3.5 h-3.5 text-primary" />
                                  Target Reduction Target: <span className="text-primary font-black">{activePercent}%</span>
                                </span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  Saves ~₹{opp.realisticMonthlySavings.toLocaleString('en-IN')}/mo (~₹{opp.estimatedAnnualSavings.toLocaleString('en-IN')}/yr)
                                </span>
                              </div>
                              <Slider
                                min={10}
                                max={opp.maxReductionTargetPercent}
                                step={5}
                                value={[activePercent]}
                                onValueChange={(val) => handleUpdateOpportunityPercent(opp.leakId, val[0])}
                                className="w-full"
                              />
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Conservative: {opp.conservativeReductionTargetPercent}%</span>
                                <span>Realistic: {opp.realisticReductionTargetPercent}%</span>
                                <span>Max: {opp.maxReductionTargetPercent}%</span>
                              </div>
                            </div>
                          )}

                          {/* Contributing Transactions Drawer */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Contributing Records ({opp.transactions.length})
                            </span>
                            <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-xs">
                              {opp.transactions.slice(0, 5).map((t, idx) => (
                                <div key={idx} className="flex items-center justify-between py-1 px-2.5 rounded bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300">
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="text-[10px] font-medium opacity-60 shrink-0">{t.date}</span>
                                    <span className="truncate font-medium">{t.description}</span>
                                  </div>
                                  <span className="font-bold shrink-0 ml-2">₹{t.amount.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                              {opp.transactions.length > 5 && (
                                <p className="text-[10px] text-muted-foreground italic text-center pt-0.5">
                                  + {opp.transactions.length - 5} additional logged transactions
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Decision Action Buttons */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t">
                            {opp.status !== 'addressed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleUpdateOpportunityStatus(opp.leakId, 'addressed')}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Addressed
                              </Button>
                            )}

                            {opp.status !== 'dismissed' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground hover:text-rose-600"
                                onClick={() => handleUpdateOpportunityStatus(opp.leakId, 'dismissed')}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" /> Dismiss
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleUpdateOpportunityStatus(opp.leakId, 'active')}
                              >
                                Restore Opportunity
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Wealth Destinations */}
            <TabsContent value="destinations" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Recommended Wealth Allocation</h3>
                  <p className="text-xs text-muted-foreground">
                    Allocates your ~₹{report.suggestedMonthlyInvestment.toLocaleString('en-IN')}/month target according to liquidity needs, debts, and risk capacity.
                  </p>
                </div>
              </div>

              {report.destinations.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-muted text-muted-foreground">
                  <PiggyBank className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="font-bold text-sm text-foreground">No Monthly Savings Surplus Configured</p>
                  <p className="text-xs mt-1">Accept or adjust one or more spending leak opportunities in Tab 1 to unlock monthly investment recommendations.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.destinations.map((dest) => (
                    <Card key={dest.id} className="bg-white dark:bg-slate-900 border shadow-sm">
                      <CardHeader className="pb-3 pt-4 px-4 md:px-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge className={
                                dest.tier === 1 ? 'bg-emerald-600 text-white' :
                                dest.tier === 2 ? 'bg-amber-600 text-white' :
                                dest.tier === 3 ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                              }>
                                Tier {dest.tier} Destination
                              </Badge>
                              <Badge variant="outline" className="text-[11px] font-bold">
                                Risk: {dest.riskLevel}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-semibold">
                                {dest.allocationPercentage}% Allocation
                              </span>
                            </div>
                            <CardTitle className="text-base font-bold">{dest.categoryName}</CardTitle>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Suggested SIP</span>
                            <span className="text-base md:text-xl font-black text-primary">₹{dest.suggestedMonthlyAmount.toLocaleString('en-IN')}<span className="text-xs font-normal opacity-70">/mo</span></span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="px-4 md:px-6 pb-4 pt-0 space-y-3.5 text-xs">
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {dest.suitabilityExplanation}
                        </p>

                        {/* Compound Future Value Scenarios */}
                        <div className="p-3 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 block">
                            Hypothetical Future Value Scenarios (@ {dest.estimatedFutureValues.assumedAnnualReturnPercent}% p.a.)
                          </span>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-indigo-200/50">
                              <span className="text-[10px] text-muted-foreground block font-semibold">1 Year</span>
                              <span className="text-xs md:text-sm font-black text-indigo-600 dark:text-indigo-400">₹{dest.estimatedFutureValues.year1.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-indigo-200/50">
                              <span className="text-[10px] text-muted-foreground block font-semibold">3 Years</span>
                              <span className="text-xs md:text-sm font-black text-indigo-600 dark:text-indigo-400">₹{dest.estimatedFutureValues.year3.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-indigo-200/50">
                              <span className="text-[10px] text-muted-foreground block font-semibold">5 Years</span>
                              <span className="text-xs md:text-sm font-black text-indigo-600 dark:text-indigo-400">₹{dest.estimatedFutureValues.year5.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic leading-tight">
                            *{dest.estimatedFutureValues.assumptionNote}
                          </p>
                        </div>

                        {/* Details Grid: Liquidity, Tax, Costs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                            <strong className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Liquidity & Access</strong>
                            <span className="text-slate-600 dark:text-slate-400">{dest.liquidityNotes}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                            <strong className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Fees & Expense Ratio</strong>
                            <span className="text-slate-600 dark:text-slate-400">{dest.costsAndFees}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                            <strong className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Tax Consideration</strong>
                            <span className="text-slate-600 dark:text-slate-400">{dest.taxConsiderations}</span>
                          </div>
                        </div>

                        {/* Specific Categories */}
                        <div className="pt-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-1">
                            Suitable Regulated Categories (Consult SEBI Registered Scheme Documents):
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                            {dest.recommendedAssetTypes.map((t, idx) => (
                              <li key={idx} className="font-medium">{t}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: Safety Audit & Profile Tuner */}
            <TabsContent value="safety" className="space-y-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Calibrate Your Financial Profile
                </h3>
                <p className="text-xs text-muted-foreground">
                  WealthPilot AI dynamically shifts allocations between emergency liquid cash, debt elimination, and long-term index growth based on these parameters.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">Time Horizon</label>
                    <select
                      value={timeHorizon}
                      onChange={(e) => setTimeHorizon(e.target.value as TimeHorizon)}
                      className="w-full text-xs p-2 rounded-lg border bg-background font-medium"
                    >
                      <option value="short">Short (&lt; 12 Months) - Capital Safety</option>
                      <option value="medium">Medium (1 - 3 Years) - Balanced</option>
                      <option value="long">Long (3 - 7+ Years) - Wealth Growth</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">Risk Tolerance</label>
                    <select
                      value={riskTolerance}
                      onChange={(e) => setRiskTolerance(e.target.value as RiskTolerance)}
                      className="w-full text-xs p-2 rounded-lg border bg-background font-medium"
                    >
                      <option value="conservative">Conservative (Low Volatility)</option>
                      <option value="moderate">Moderate (Balanced Hybrid)</option>
                      <option value="aggressive">Aggressive (Maximum Equity Growth)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">Emergency Reserves</label>
                    <select
                      value={emergencyBufferAdequate ? 'adequate' : 'underfunded'}
                      onChange={(e) => setEmergencyBufferAdequate(e.target.value === 'adequate')}
                      className="w-full text-xs p-2 rounded-lg border bg-background font-medium"
                    >
                      <option value="underfunded">Underfunded (&lt; 3 months cushion)</option>
                      <option value="adequate">Adequate (&gt; 3 months expenses)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Safety Audit Checks from Agent 4 */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Financial Safety & Feasibility Audit (Agent 4)
                </h4>

                {report.safetyAudit.checks.map((check) => (
                  <div
                    key={check.id}
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                      check.severity === 'critical'
                        ? 'bg-rose-50/80 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800/40 dark:text-rose-200'
                        : check.severity === 'warning'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-200'
                        : 'bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/40 dark:text-emerald-200'
                    }`}
                  >
                    {check.severity === 'critical' ? (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    ) : check.severity === 'warning' ? (
                      <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <strong className="font-bold block">{check.title}</strong>
                      <p className="leading-relaxed opacity-90">{check.message}</p>
                      {check.suggestedAction && (
                        <p className="font-semibold mt-1 text-[11px] underline">Action: {check.suggestedAction}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Missing Info Prompts */}
                {report.safetyAudit.missingInformationPrompts.length > 0 && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border text-xs space-y-1 text-slate-700 dark:text-slate-300">
                    <span className="font-bold block text-foreground">Missing Profile Information:</span>
                    <p className="text-[11px] text-muted-foreground">
                      For more tailored advice, consider providing: {report.safetyAudit.missingInformationPrompts.join(', ')}.
                    </p>
                  </div>
                )}
              </div>

              {/* Statutory Disclaimer */}
              <div className="text-[10px] text-muted-foreground italic border-t pt-3 leading-relaxed">
                {report.safetyAudit.disclaimer}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer with Action */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            Total Realistic Opportunity: <strong className="text-primary font-bold">₹{report.estimatedMonthlySavings.toLocaleString('en-IN')}/mo</strong> (~₹{report.estimatedAnnualSavings.toLocaleString('en-IN')}/yr)
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1.5 flex-1 sm:flex-initial"
              onClick={() => {
                setOpen(false);
                router.push(`/chat?q=${encodeURIComponent(`WealthPilot AI has identified potential monthly savings opportunities of ₹${report.estimatedMonthlySavings.toLocaleString('en-IN')} from spending leaks. Can you break down step-by-step how I should execute these cuts and set up my emergency fund and index SIPs?`)}`);
              }}
            >
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span>Discuss with AI Mentor</span>
            </Button>

            <Button
              size="sm"
              className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial"
              onClick={() => setOpen(false)}
            >
              <span>Done</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
