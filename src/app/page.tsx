'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AddExpenseDialog } from '@/components/finchat/add-expense-dialog';
import { DatePickerWithRange } from '@/components/finchat/date-range-picker';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpRight, 
  Wallet, 
  CreditCard, 
  DollarSign, 
  Loader2, 
  TrendingDown, 
  AlertCircle, 
  PieChart as PieChartIcon, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Table as TableIcon, 
  UploadCloud 
} from 'lucide-react';
import { UploadStatementDialog } from '@/components/finchat/upload-statement-dialog';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { EditBudgetDialog } from '@/components/finchat/edit-budget-dialog';
import { SavingsInvestmentOpportunitiesDialog } from '@/components/finchat/savings-investment-opportunities-dialog';
import { QuickActionsBox } from '@/components/finchat/quick-actions-box';
import { WealthManagementAgentSection } from '@/components/finchat/wealth-management-agent-section';
import { useFinancialData } from '@/context/financial-data-context';

export default function DashboardPage() {
  const router = useRouter();
  const {
    allTransactions,
    activeTransactions,
    dateRange,
    setDateRange,
    customBudgets,
    updateBudgets,
    budgetProgress,
    categorySpendingMap,
    guardianInsight,
    stats,
    chartData,
    categoryData,
    isLoading,
    refreshData
  } = useFinancialData();

  const recentTransactions = useMemo(() => activeTransactions.slice(0, 10), [activeTransactions]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 gap-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <SidebarTrigger />
            <h2 className="text-lg font-bold truncate text-primary">Overview & Financial Intelligence</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3 justify-end flex-shrink-0 flex-wrap">
            <DatePickerWithRange selectedRange={dateRange} onRangeChange={setDateRange} />
            <UploadStatementDialog onUploadSuccess={refreshData} />
            <AddExpenseDialog onSuccess={refreshData} />
          </div>
        </header>

        <main className="p-4 md:p-8 space-y-8">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { title: 'Total Balance', value: `₹${stats.totalBalance.toLocaleString('en-IN')}`, icon: Wallet, color: 'text-primary' },
              { title: 'Period Spending', value: `₹${stats.monthlySpending.toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-accent' },
              { title: 'Savings Rate', value: `${stats.savingsRate}%`, icon: ArrowUpRight, color: 'text-green-600' },
              { title: 'Projected Tax', value: `₹${stats.projectedTax.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-orange-600' },
            ].map((stat, i) => (
              <Card key={i} className="border-none shadow-sm hover:shadow-lg transition-all h-full bg-white/60 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-black text-foreground">{stat.value}</div>
                  <p className="text-[10px] md:text-xs mt-1 text-muted-foreground font-medium">
                    Live data from indexed statements
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Section 1: Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Spending Trends</CardTitle>
                <CardDescription>Visual breakdown of periodic expenditure</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] md:h-[350px] pr-0">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                      <Tooltip 
                        cursor={{ fill: '#f3f4f6' }} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Spent']}
                      />
                      <Bar dataKey="spent" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 shrink-0">
                    <PieChartIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Expense Distribution</CardTitle>
                    <CardDescription className="text-xs font-medium">Categorized spending patterns</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[280px] md:h-[350px]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                      />
                      <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px', fontWeight: '500' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm text-center px-8 font-medium gap-3">
                    <p>No data detected for this period. Upload a CSV to see distribution.</p>
                    <UploadStatementDialog 
                      onUploadSuccess={refreshData}
                      trigger={
                        <Button size="sm" variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                          <UploadCloud className="w-4 h-4" />
                          <span>Upload Statement</span>
                        </Button>
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dedicated Section: Wealth Management & Asset Opportunity Agent */}
          <WealthManagementAgentSection
            allTransactions={allTransactions}
            activeTransactions={activeTransactions}
            stats={stats}
          />

          {/* Section 2: Unified Quick Actions Box with In-Place Output */}
          <QuickActionsBox
            allTransactions={allTransactions}
            activeTransactions={activeTransactions}
            budgetProgress={budgetProgress}
            stats={stats}
          />

          {/* Section 3: Guardrails & Activity Log Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-red-50 p-2 rounded-xl border border-red-100 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Budget Guardrail</CardTitle>
                    <CardDescription className="text-xs font-medium">Real-time limit monitoring (INR)</CardDescription>
                  </div>
                </div>
                <EditBudgetDialog 
                  currentBudgets={customBudgets} 
                  onBudgetsUpdated={(updated) => {
                    updateBudgets(updated);
                  }}
                />
              </CardHeader>
              <CardContent className="space-y-5 max-h-[420px] overflow-y-auto pr-2">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
                ) : budgetProgress.length > 0 ? (
                  budgetProgress.map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-foreground">{item.name}</span>
                          <span className="text-muted-foreground text-[10px] font-bold">LIMIT: ₹{item.budget.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "font-black text-base",
                            item.status === 'Exceeded' ? "text-red-600" : "text-green-600"
                          )}>
                            ₹{item.spent.toLocaleString('en-IN')}
                          </span>
                          <span className="text-muted-foreground text-[10px] ml-1 font-bold">({item.percent}%)</span>
                        </div>
                      </div>
                      <Progress value={Math.min(item.percent, 100)} className={cn(
                        "h-2",
                        item.status === 'Exceeded' ? "bg-red-100 [&>div]:bg-red-500" : "bg-green-100 [&>div]:bg-green-500"
                      )} />
                      {item.status === 'Exceeded' && (
                        <div className="bg-red-50 border border-red-100 p-2 rounded-xl flex items-center gap-2 animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <p className="text-[10px] text-red-700 font-bold leading-tight">
                            CRITICAL: Budget breached by ₹{item.breach.toLocaleString('en-IN')}! Ask AI for waste analysis.
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm font-medium italic">
                    No budget activity detected.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm flex flex-col h-full bg-white/60 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Activity Log</CardTitle>
                  <CardDescription>Latest transactions & manual logs</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-[420px]">
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                    </div>
                  ) : recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between gap-3 border-b border-muted pb-3.5 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-primary/5 p-2 rounded-xl shrink-0 border border-primary/10">
                            <CreditCard className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate text-foreground">{tx.description}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground font-medium truncate">{tx.category} • {tx.date}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black shrink-0 text-foreground">
                          ₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-sm text-muted-foreground font-medium">No activity in this period.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 4: Full Transaction Ledger */}
          <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="bg-primary/5 p-2 rounded-xl border border-primary/10">
                <TableIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Transaction Ledger</CardTitle>
                <CardDescription className="text-xs font-medium">Detailed log of all financial records in range</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
              ) : activeTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-muted">
                        <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Date</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Description</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Category</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-muted-foreground text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTransactions.map((tx) => (
                        <TableRow key={tx.id} className="border-muted hover:bg-white/40 transition-colors">
                          <TableCell className="text-xs font-medium py-3">{tx.date}</TableCell>
                          <TableCell className="text-xs font-bold py-3 truncate max-w-[220px]">{tx.description}</TableCell>
                          <TableCell className="text-xs py-3">
                            <span className="bg-primary/5 text-primary px-2 py-1 rounded-md text-[10px] font-bold border border-primary/10">
                              {tx.category}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-black py-3 text-right">
                            ₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm font-medium">
                  <p className="italic">No records found for this period.</p>
                  <UploadStatementDialog 
                    onUploadSuccess={refreshData}
                    trigger={
                      <Button size="sm" variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload File</span>
                      </Button>
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
