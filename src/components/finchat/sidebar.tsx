'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  UploadCloud, 
  Landmark, 
  TrendingDown,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { cn, parseCSVLine } from '@/lib/utils';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarFooter
} from '@/components/ui/sidebar';
import { useFinancialData } from '@/context/financial-data-context';

const navItems = [
  { name: 'Overview & Intel', href: '/', icon: LayoutDashboard },
  { name: 'FinChat AI', href: '/chat', icon: MessageSquare },
  { name: 'Ledger Docs', href: '/upload', icon: UploadCloud },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { guardianInsight, isLoading: loadingInsight } = useFinancialData();
  const insight = guardianInsight.insight;
  const insightType = guardianInsight.insightType;

  return (
    <Sidebar className="border-r-0 shadow-2xl">
      <SidebarHeader className="p-8">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-accent to-primary rounded-xl p-2.5 shadow-lg shadow-accent/20 border border-white/10">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white leading-none">FinChat AI</h1>
            <span className="text-[10px] font-black uppercase text-accent tracking-widest mt-1 block">Elite Guardian</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 mt-4">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href} className="mb-2">
              <SidebarMenuButton 
                asChild 
                isActive={pathname === item.href}
                className={cn(
                  "hover:bg-sidebar-accent transition-all duration-300 py-6 rounded-xl",
                  pathname === item.href ? "bg-sidebar-accent shadow-md scale-[1.02]" : "opacity-70"
                )}
              >
                <Link href={item.href} className="flex items-center gap-4 px-4">
                  <item.icon className={cn("w-5 h-5", pathname === item.href ? "text-accent" : "")} />
                  <span className="font-bold tracking-tight text-sm uppercase">{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-6">
        <div className={cn(
          "rounded-2xl p-5 border backdrop-blur-md transition-all",
          insightType === 'alert' ? "bg-red-500/15 border-red-500/30" : 
          insightType === 'healthy' ? "bg-green-500/15 border-green-500/30" : "bg-sidebar-accent/40 border-white/5"
        )}>
          <div className="flex items-center gap-2 mb-3">
            {insightType === 'alert' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : insightType === 'healthy' ? (
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 text-accent shrink-0" />
            )}
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              insightType === 'alert' ? "text-red-400" : 
              insightType === 'healthy' ? "text-green-400" : "text-accent"
            )}>
              Guardian Insight
            </span>
          </div>
          {loadingInsight ? (
            <div className="flex items-center gap-2 text-sidebar-foreground/60 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-[10px]">Analyzing data...</span>
            </div>
          ) : (
            <p className="text-[11px] text-sidebar-foreground/90 leading-relaxed font-medium italic">
              {insight}
            </p>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
