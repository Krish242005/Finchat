'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  TrendingUp, 
  ArrowRight, 
  PiggyBank, 
  Flame, 
  Coins
} from 'lucide-react';
import type { Transaction } from '@/lib/types';
import { runWealthPilotWorkflow } from '@/lib/wealthpilot/orchestrator';
import { calculateFutureValueMonthlySIP } from '@/lib/wealthpilot/wealthpilot-guidance-agent';
import { SavingsInvestmentOpportunitiesDialog } from './savings-investment-opportunities-dialog';

interface WealthManagementAgentSectionProps {
  allTransactions: Transaction[];
  activeTransactions: Transaction[];
  stats: {
    totalBalance: number;
    monthlySpending: number;
    savingsRate: number;
    projectedTax: number;
  };
}

type StrategyType = 'maximum_returns' | 'balanced' | 'capital_shield';

export function WealthManagementAgentSection({
  allTransactions,
  activeTransactions,
  stats
}: WealthManagementAgentSectionProps) {
  const router = useRouter();
  const [strategy, setStrategy] = useState<StrategyType>('maximum_returns');

  const transactions = activeTransactions.length > 0 ? activeTransactions : allTransactions;

  // Run WealthPilot multi-agent workflow
  const report = useMemo(() => {
    return runWealthPilotWorkflow({
      transactions,
      totalBalance: stats.totalBalance,
      monthlySpending: stats.monthlySpending
    });
  }, [transactions, stats.totalBalance, stats.monthlySpending]);

  const monthlySavings = report.estimatedMonthlySavings > 0 ? report.estimatedMonthlySavings : 2520;
  const avoidableSpend = report.totalAvoidableSpend > 0 ? report.totalAvoidableSpend : 6300;

  // Compounding Projections based on selected strategy
  const projection = useMemo(() => {
    let rate = 12;
    let assetName = 'Nifty 50 / S&P 500 Index Fund';
    let assetTag = 'Max Returns (12% CAGR)';

    if (strategy === 'balanced') {
      rate = 10;
      assetName = 'Hybrid & Multi-Asset Fund';
      assetTag = 'Balanced (10% CAGR)';
    } else if (strategy === 'capital_shield') {
      rate = 7;
      assetName = 'Liquid & Arbitrage Fund';
      assetTag = 'Shield (7% Return)';
    }

    const y1 = calculateFutureValueMonthlySIP(monthlySavings, rate, 1);
    const y3 = calculateFutureValueMonthlySIP(monthlySavings, rate, 3);
    const y5 = calculateFutureValueMonthlySIP(monthlySavings, rate, 5);
    const y10 = calculateFutureValueMonthlySIP(monthlySavings, rate, 10);

    return {
      rate,
      assetName,
      assetTag,
      milestones: [
        { period: '1 Year', invested: monthlySavings * 12, value: y1, gain: y1 - (monthlySavings * 12) },
        { period: '3 Years', invested: monthlySavings * 36, value: y3, gain: y3 - (monthlySavings * 36) },
        { period: '5 Years', invested: monthlySavings * 60, value: y5, gain: y5 - (monthlySavings * 60) },
        { period: '10 Years', invested: monthlySavings * 120, value: y10, gain: y10 - (monthlySavings * 120) }
      ]
    };
  }, [strategy, monthlySavings]);

  return (
    <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <CardHeader className="p-5 md:p-6 pb-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Badge className="bg-amber-400 text-slate-950 font-black text-[10px] tracking-wider uppercase px-2 py-0.5">
            <Sparkles className="w-3 h-3 mr-1 inline" /> Wealth Agent
          </Badge>
          <CardTitle className="text-lg md:text-xl font-black tracking-tight text-white">
            Unnecessary Spending ➔ Investment Returns
          </CardTitle>
        </div>

        <div className="flex items-center gap-2">
          <SavingsInvestmentOpportunitiesDialog
            trigger={
              <Button size="sm" className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs gap-1.5 h-8">
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <Button 
            size="sm" 
            className="bg-white text-slate-950 hover:bg-slate-200 font-bold text-xs gap-1.5 h-8 shadow-sm"
            onClick={() => router.push(`/chat?q=${encodeURIComponent(`I have ₹${monthlySavings.toLocaleString('en-IN')} in unnecessary spending leaks identified by WealthPilot. How should I allocate this into maximum return index funds and liquid emergency funds? Give me a step-by-step portfolio blueprint.`)}`)}
          >
            <span>Ask AI Advisor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 md:p-6 space-y-4">
        {/* Top Direct Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Unnecessary Spending */}
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30">
            <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Flame className="w-3.5 h-3.5 text-red-400" /> Unnecessary Spending (Waste)
            </span>
            <div className="text-2xl md:text-3xl font-black text-white">
              ₹{avoidableSpend.toLocaleString('en-IN')}
              <span className="text-xs font-normal text-red-200">/mo</span>
            </div>
          </div>

          {/* 2. Amount You Can Save */}
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1 mb-1">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-400" /> Amount You Can Save
            </span>
            <div className="text-2xl md:text-3xl font-black text-emerald-300">
              ₹{monthlySavings.toLocaleString('en-IN')}
              <span className="text-xs font-normal text-emerald-200">/mo</span>
            </div>
          </div>

          {/* 3. Recommended Investment Asset */}
          <div className="p-4 rounded-xl bg-indigo-950/50 border border-indigo-400/30">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" /> Where to Invest (Max Return)
            </span>
            <div className="text-base md:text-lg font-black text-amber-300 truncate">
              {projection.assetName}
            </div>
            <span className="text-[11px] font-bold text-indigo-200 block mt-0.5">
              {projection.rate}% p.a. expected returns
            </span>
          </div>
        </div>

        {/* 2-Column Direct Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: Where the Money is Being Wasted */}
          <div className="lg:col-span-5 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-white">Where You Are Wasting Money</span>
              <Badge variant="outline" className="text-[9px] text-red-300 border-red-500/30 bg-red-950/40 uppercase">
                Waste Outflows
              </Badge>
            </div>

            <div className="space-y-2">
              {report.detectedLeaks.length > 0 ? (
                report.detectedLeaks.map(leak => (
                  <div key={leak.id} className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">{leak.title}</span>
                      <span className="text-[10px] text-slate-400">{leak.category}</span>
                    </div>
                    <span className="text-xs font-black text-red-400">
                      ₹{leak.monthlyAmount.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-xs text-slate-400 italic">No waste detected.</div>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300">Save Monthly</span>
              <span className="text-xs font-black text-emerald-300">₹{monthlySavings.toLocaleString('en-IN')}/mo</span>
            </div>
          </div>

          {/* Right: Calculated Investment Returns */}
          <div className="lg:col-span-7 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
            {/* Header with quick asset tabs */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Calculated Returns on Saving ₹{monthlySavings.toLocaleString('en-IN')}/mo
              </span>

              <div className="flex items-center gap-1 p-0.5 bg-black/50 rounded-lg">
                <button
                  type="button"
                  onClick={() => setStrategy('maximum_returns')}
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded transition-all ${
                    strategy === 'maximum_returns' 
                      ? 'bg-amber-400 text-slate-950' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Max (12%)
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy('balanced')}
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded transition-all ${
                    strategy === 'balanced' 
                      ? 'bg-indigo-400 text-slate-950' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Balanced (10%)
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy('capital_shield')}
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded transition-all ${
                    strategy === 'capital_shield' 
                      ? 'bg-emerald-400 text-slate-950' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Shield (7%)
                </button>
              </div>
            </div>

            {/* Direct Investment Return Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {projection.milestones.map((m, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-white/10 text-center space-y-0.5">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase block">{m.period}</span>
                  <span className="text-sm md:text-base font-black text-white block">
                    ₹{m.value.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-400 block">
                    +₹{m.gain.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    Saved: ₹{m.invested.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-indigo-200/90 font-medium flex items-center justify-between pt-1">
              <span>Invest destination: <strong className="text-white">{projection.assetName}</strong></span>
              <span className="text-amber-400 font-bold">{projection.rate}% Annual Return</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
