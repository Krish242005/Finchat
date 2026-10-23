'use client';

import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  TrendingUp, 
  ShieldAlert, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StructuredMessageRendererProps {
  content: string;
  role?: 'user' | 'assistant';
}

/**
 * Parses and renders AI messages with executive-grade typography, tables, badges, callouts, and lists.
 */
export function StructuredMessageRenderer({ content, role = 'assistant' }: StructuredMessageRendererProps) {
  if (role === 'user') {
    return <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{content}</div>;
  }

  // Parse sections, tables, lists, and formatting blocks
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  let elementKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Table Detection: Check if current line starts with | and next line has |-
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // Parse header and rows
        const headerCells = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map(c => c.trim());
        
        // Skip separator line (|---|---|)
        const rowLines = tableLines.slice(2);
        const rows = rowLines.map(rowLine =>
          rowLine
            .split('|')
            .slice(1, -1)
            .map(c => c.trim())
        );

        elements.push(
          <div key={`table-${elementKey++}`} className="my-3 overflow-x-auto rounded-xl border border-border/80 bg-white/60 dark:bg-slate-900/60 shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-foreground font-bold border-b border-border/60">
                <tr>
                  {headerCells.map((header, hIdx) => (
                    <th key={hIdx} className="p-2.5 px-3 uppercase tracking-wider font-bold text-[11px] text-muted-foreground whitespace-nowrap">
                      {renderInlineFormatting(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2.5 px-3 text-foreground font-medium align-middle">
                        {renderInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Headings: ### or ## or #
    if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
      const headingLevel = line.startsWith('### ') ? 3 : line.startsWith('## ') ? 2 : 1;
      const headingText = line.replace(/^#{1,3}\s+/, '').trim();
      
      const isBreachHeader = headingText.toLowerCase().includes('breach') || headingText.toLowerCase().includes('warning') || headingText.toLowerCase().includes('exceeded');
      const isRecoveryHeader = headingText.toLowerCase().includes('recovery') || headingText.toLowerCase().includes('recommendation') || headingText.toLowerCase().includes('action');
      const isSummaryHeader = headingText.toLowerCase().includes('summary') || headingText.toLowerCase().includes('overview');

      elements.push(
        <div 
          key={`heading-${elementKey++}`} 
          className={cn(
            "flex items-center gap-2 mt-4 mb-2 pb-1.5 border-b",
            isBreachHeader ? "border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400" :
            isRecoveryHeader ? "border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400" :
            "border-border/60 text-foreground"
          )}
        >
          {isBreachHeader && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {isRecoveryHeader && <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />}
          {isSummaryHeader && <Info className="w-4 h-4 shrink-0 text-primary" />}
          <h4 className={cn(
            "font-black tracking-tight",
            headingLevel === 1 ? "text-base uppercase" :
            headingLevel === 2 ? "text-sm uppercase" : "text-xs uppercase"
          )}>
            {renderInlineFormatting(headingText)}
          </h4>
        </div>
      );
      i++;
      continue;
    }

    // 3. Blockquotes: > quote text
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const quoteContent = quoteLines.join('\n');
      elements.push(
        <div key={`quote-${elementKey++}`} className="my-2.5 p-3 rounded-lg border-l-4 border-primary bg-primary/5 dark:bg-primary/10 text-foreground text-xs leading-relaxed font-medium">
          {renderInlineFormatting(quoteContent)}
        </div>
      );
      continue;
    }

    // 4. Bullet lists: lines starting with - or *
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().substring(2));
        i++;
      }
      elements.push(
        <ul key={`list-${elementKey++}`} className="my-2 space-y-1.5 text-xs">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 leading-relaxed text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0 mt-1.5" />
              <span>{renderInlineFormatting(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 5. Numbered lists: lines starting with 1. 2. etc.
    if (/^\s*\d+\.\s+/.test(line)) {
      const numberedItems: { num: string; text: string }[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const match = lines[i].match(/^\s*(\d+)\.\s+(.*)/);
        if (match) {
          numberedItems.push({ num: match[1], text: match[2] });
        }
        i++;
      }
      elements.push(
        <div key={`numbered-list-${elementKey++}`} className="my-2 space-y-2 text-xs">
          {numberedItems.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border/50">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                {item.num}
              </span>
              <div className="flex-1 leading-relaxed text-foreground font-medium">
                {renderInlineFormatting(item.text)}
              </div>
            </div>
          ))}
        </div>
      );
      continue;
    }

    // 6. Regular text lines / empty spacing
    if (line.trim() === '') {
      i++;
      continue;
    }

    elements.push(
      <p key={`p-${elementKey++}`} className="my-1.5 text-xs leading-relaxed text-foreground/90 font-medium">
        {renderInlineFormatting(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1 text-xs">{elements}</div>;
}

/**
 * Handles bold (**text**), inline currency amounts (₹X,XXX), inline code (`code`), and status badges ([Status])
 */
function renderInlineFormatting(text: string): React.ReactNode {
  // Regex to match bold (**text**), inline code (`code`), currency (₹[0-9,]+), or badges ([Status])
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|₹\s?[\d,]+(?:\.\d+)?|\[(?:Within limit|Exceeded|Breached|Safe|Warning|Critical|Info)\])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2);
      const isRed = boldText.toLowerCase().includes('breach') || boldText.toLowerCase().includes('exceed') || boldText.toLowerCase().includes('deficit');
      const isGreen = boldText.toLowerCase().includes('within limit') || boldText.toLowerCase().includes('surplus') || boldText.toLowerCase().includes('safe');

      parts.push(
        <strong 
          key={match.index} 
          className={cn(
            "font-black tracking-tight",
            isRed ? "text-red-600 dark:text-red-400 font-black" :
            isGreen ? "text-emerald-600 dark:text-emerald-400 font-black" :
            "text-foreground"
          )}
        >
          {boldText}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-primary border border-border/60">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('₹')) {
      parts.push(
        <span key={match.index} className="font-bold text-foreground inline-flex items-baseline">
          {token}
        </span>
      );
    } else if (token.startsWith('[') && token.endsWith(']')) {
      const status = token.slice(1, -1);
      const isBreach = status === 'Exceeded' || status === 'Breached' || status === 'Critical';
      const isSafe = status === 'Within limit' || status === 'Safe';

      parts.push(
        <Badge
          key={match.index}
          variant={isBreach ? "destructive" : isSafe ? "secondary" : "outline"}
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider mx-1 px-1.5 py-0",
            isSafe && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300"
          )}
        >
          {status}
        </Badge>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
