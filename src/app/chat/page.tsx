'use client';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetTrigger 
} from '@/components/ui/sheet';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Loader2, 
  PlusCircle,
  MessageSquare,
  History,
  Trash2,
  Clock,
  Sparkles,
  MessageSquarePlus,
  CheckCircle2
} from 'lucide-react';
import { askFinancialQuestion } from '@/app/lib/actions';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { normalizeCategory } from '@/lib/budget-calculations';
import { useFinancialData } from '@/context/financial-data-context';
import { StructuredMessageRenderer } from '@/components/finchat/structured-message-renderer';
import { format } from 'date-fns';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const STORAGE_KEY = 'finchat_chat_sessions_v1';

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: "Namaste! I'm your FinChat Assistant. Ask me anything about your uploaded financial documents, bank statements, or overall spending patterns in Rupees (₹)."
};

function createNewSession(initialTitle = 'New Conversation', initialMessages: ChatMessage[] = [DEFAULT_WELCOME_MESSAGE]): ChatSession {
  const now = new Date().toISOString();
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: initialTitle,
    createdAt: now,
    updatedAt: now,
    messages: initialMessages
  };
}

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');
  
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Chat sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const db = useFirestore();
  const { customBudgets, budgetProgress } = useFinancialData();

  // Load chat history from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ChatSession[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved chat history from localStorage', e);
    }

    // Default initialization if none exists
    const initialSession = createNewSession();
    setSessions([initialSession]);
    setActiveSessionId(initialSession.id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([initialSession]));
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  // Save sessions to localStorage whenever they change
  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (e) {
      console.warn('Failed to save chat sessions to localStorage', e);
    }
  };

  // Currently active session and messages
  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || sessions[0] || null;
  }, [sessions, activeSessionId]);

  const messages = activeSession?.messages || [DEFAULT_WELCOME_MESSAGE];

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle auto-sending initial query from URL (e.g. from WealthPilot or Quick Actions)
  useEffect(() => {
    if (mounted && initialQuery && !hasAutoSent && user && db && !isLoading && sessions.length > 0) {
      setHasAutoSent(true);
      
      // Derive a clean title from query
      const queryTitle = initialQuery.length > 38 
        ? `${initialQuery.slice(0, 38).trim()}...` 
        : initialQuery;

      // Create a dedicated new session for this incoming query
      const newSession = createNewSession(queryTitle, [
        DEFAULT_WELCOME_MESSAGE,
        { role: 'user', content: initialQuery }
      ]);

      const updated = [newSession, ...sessions];
      saveSessions(updated);
      setActiveSessionId(newSession.id);

      // Execute query
      handleExecuteQuery(initialQuery, newSession.id, updated);
    }
  }, [mounted, initialQuery, user, db, hasAutoSent, sessions]);

  // Create New Chat
  const handleNewChat = () => {
    const newSession = createNewSession();
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newSession.id);
    setIsHistoryOpen(false);
    setInput('');
  };

  // Delete a specific chat
  const handleDeleteChat = (sessionIdToDelete: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const updated = sessions.filter(s => s.id !== sessionIdToDelete);
    if (updated.length === 0) {
      // If all deleted, initialize a clean fresh chat
      const fresh = createNewSession();
      saveSessions([fresh]);
      setActiveSessionId(fresh.id);
    } else {
      saveSessions(updated);
      if (activeSessionId === sessionIdToDelete) {
        setActiveSessionId(updated[0].id);
      }
    }
  };

  // Clear all chats
  const handleClearAllHistory = () => {
    const fresh = createNewSession();
    saveSessions([fresh]);
    setActiveSessionId(fresh.id);
    setIsHistoryOpen(false);
  };

  // Select an existing chat from history
  const handleSelectChat = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsHistoryOpen(false);
  };

  // Execute query against OpenAI
  const handleExecuteQuery = async (queryText: string, targetSessionId: string, currentSessions: ChatSession[]) => {
    if (!user || !db) return;
    setIsLoading(true);

    try {
      const docsSnapshot = await getDocs(collection(db, 'users', user.uid, 'documents'));
      const relevantChunks: any[] = [];
      
      for (const docSnap of docsSnapshot.docs) {
        const chunksSnapshot = await getDocs(query(
          collection(db, 'users', user.uid, 'documents', docSnap.id, 'chunks'), 
          orderBy('transactionDate', 'desc'),
          limit(30)
        ));
        chunksSnapshot.forEach(chunk => {
          const data = chunk.data();
          relevantChunks.push({
            text: data.chunkText,
            metadata: {
              date: data.transactionDate || 'Unknown',
              category: normalizeCategory(data.category, data.chunkText),
              amount: data.amount,
              fileName: docSnap.data().filename
            }
          });
        });
      }

      const response = await askFinancialQuestion(queryText, relevantChunks, customBudgets, budgetProgress);
      
      // Update session with assistant answer
      setSessions(prev => {
        const updated = prev.map(s => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              messages: [
                ...s.messages,
                { role: 'assistant' as const, content: response.answer }
              ]
            };
          }
          return s;
        });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    } catch (error) {
      console.error(error);
      setSessions(prev => {
        const updated = prev.map(s => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              messages: [
                ...s.messages,
                { 
                  role: 'assistant' as const, 
                  content: "I'm sorry, I encountered an error while analyzing your data. Please check your network connection or API limits and try again." 
                }
              ]
            };
          }
          return s;
        });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (customMsg?: string) => {
    const msgToSend = customMsg || input.trim();
    if (!msgToSend || isLoading || !user || !db || !activeSession) return;

    if (!customMsg) setInput('');

    const targetSessionId = activeSession.id;
    const isFirstUserMessage = activeSession.messages.filter(m => m.role === 'user').length === 0;

    // Generate descriptive title if still default
    let newTitle = activeSession.title;
    if (isFirstUserMessage || activeSession.title === 'New Conversation') {
      newTitle = msgToSend.length > 36 ? `${msgToSend.slice(0, 36).trim()}...` : msgToSend;
    }

    // Append user message immediately
    const updatedWithUser = sessions.map(s => {
      if (s.id === targetSessionId) {
        return {
          ...s,
          title: newTitle,
          updatedAt: new Date().toISOString(),
          messages: [...s.messages, { role: 'user' as const, content: msgToSend }]
        };
      }
      return s;
    });

    saveSessions(updatedWithUser);
    handleExecuteQuery(msgToSend, targetSessionId, updatedWithUser);
  };

  if (!mounted) return null;

  return (
    <div className="bg-background flex flex-col h-svh overflow-hidden w-full">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <SidebarTrigger />
          <div className="flex items-center gap-3 truncate">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="text-sm md:text-base font-bold truncate text-foreground leading-tight">
                {activeSession?.title || 'Financial Chat'}
              </h2>
              <span className="text-[10px] text-muted-foreground font-medium block truncate">
                {messages.length} messages in this session
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 1. New Chat Button */}
          <Button 
            variant="default" 
            size="sm" 
            className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs" 
            onClick={handleNewChat}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </Button>

          {/* 2. Chat History Sheet Drawer */}
          <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800">
                <History className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">History</span>
                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary">
                  {sessions.length}
                </Badge>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[340px] sm:w-[400px] p-0 flex flex-col bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-l border-border">
              <SheetHeader className="p-5 pb-3 border-b border-border/60 bg-white/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    <SheetTitle className="text-base font-black tracking-tight text-foreground uppercase">
                      Chat History
                    </SheetTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'}
                  </Badge>
                </div>
                <SheetDescription className="text-xs text-muted-foreground">
                  Saved financial analyses and OpenAI query sessions.
                </SheetDescription>

                {/* Top New Chat inside drawer */}
                <div className="pt-2">
                  <Button 
                    className="w-full gap-2 text-xs font-bold bg-primary text-primary-foreground shadow-sm"
                    size="sm"
                    onClick={handleNewChat}
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    <span>Start New Chat</span>
                  </Button>
                </div>
              </SheetHeader>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {sessions.map(session => {
                  const isActive = session.id === activeSessionId;
                  const lastMsg = session.messages[session.messages.length - 1]?.content || 'Empty conversation';
                  
                  let formattedDate = 'Recent';
                  try {
                    formattedDate = format(new Date(session.updatedAt), 'dd MMM, hh:mm a');
                  } catch (e) {}

                  return (
                    <div
                      key={session.id}
                      onClick={() => handleSelectChat(session.id)}
                      className={cn(
                        "p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between relative",
                        isActive
                          ? "bg-white dark:bg-slate-900 border-primary/50 shadow-md ring-1 ring-primary/20"
                          : "bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 border-border/70"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MessageSquare className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                          <h4 className={cn("text-xs font-bold truncate", isActive ? "text-primary" : "text-foreground")}>
                            {session.title}
                          </h4>
                        </div>
                        {/* Delete this chat button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 shrink-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                          onClick={(e) => handleDeleteChat(session.id, e)}
                          title="Delete Chat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <p className="text-[11px] text-muted-foreground font-medium line-clamp-1 mb-2">
                        {lastMsg}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 opacity-60" />
                          {formattedDate}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                            {session.messages.length} msgs
                          </span>
                          {isActive && (
                            <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 font-bold px-1.5 py-0">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Drawer Footer with Clear All */}
              <div className="p-4 border-t border-border/60 bg-white/40 dark:bg-slate-900/40 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5 w-full justify-center font-bold"
                  onClick={handleClearAllHistory}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All History</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* 3. Delete Current Chat Button */}
          {activeSession && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 w-8"
              onClick={() => handleDeleteChat(activeSession.id)}
              title="Delete Current Chat"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={cn(
              "flex gap-4 max-w-4xl mx-auto w-full",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs",
              msg.role === 'user' ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
            )}>
              {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            
            <div className={cn(
              "space-y-4 max-w-[90%] md:max-w-[85%]",
              msg.role === 'user' ? "flex flex-col items-end" : "flex flex-col items-start"
            )}>
              <Card className={cn(
                "border border-border/60 shadow-sm",
                msg.role === 'user' 
                  ? "bg-white dark:bg-slate-900 text-foreground" 
                  : "bg-slate-50/80 dark:bg-slate-900/80 text-foreground"
              )}>
                <CardContent className="p-3.5 md:p-5 leading-relaxed text-sm overflow-hidden">
                  <StructuredMessageRenderer content={msg.content} role={msg.role} />
                </CardContent>
              </Card>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 max-w-4xl mx-auto w-full">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-primary/5 rounded-2xl px-4 py-3 text-sm flex items-center gap-2 border border-primary/10">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs sm:text-sm font-medium">Analyzing records & calculating structured insights...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-4 md:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-border">
        <div className="max-w-4xl mx-auto relative">
          <Input 
            placeholder="Ask about spending in ₹, budget breaches, investment plans..." 
            className="pr-12 py-6 bg-white dark:bg-slate-950 shadow-sm border-primary/20 focus-visible:ring-primary text-xs md:text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button 
            size="icon" 
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full w-9 h-9 bg-primary text-primary-foreground"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-center mt-2 text-muted-foreground font-medium">
          FinChat AI utilizes your private data context. Analysis is based solely on your indexed records.
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col h-svh overflow-hidden">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
          <ChatContent />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
