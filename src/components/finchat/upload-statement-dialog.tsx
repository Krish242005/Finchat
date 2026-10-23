'use client';

import { useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  UploadCloud, 
  FileUp, 
  FileSpreadsheet, 
  FileText, 
  Loader2, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { categorizeExpenses } from '@/ai/flows/categorize-expense-flow';
import { mapCSVSchema, type CSVSchemaMapping } from '@/ai/flows/map-csv-schema-flow';
import { hashDocumentContent, getCachedDocument, setCachedDocument } from '@/lib/redis';
import { parseCSVLine, cn } from '@/lib/utils';
import { normalizeDateToISO } from '@/lib/budget-calculations';

interface UploadStatementDialogProps {
  onUploadSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function UploadStatementDialog({ onUploadSuccess, trigger }: UploadStatementDialogProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [lastMapping, setLastMapping] = useState<CSVSchemaMapping | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  const resetState = () => {
    setUploading(false);
    setIsDragging(false);
    setProcessingStatus('');
    setLastMapping(null);
    setUploadSuccess(false);
    setCurrentFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (uploading) return; // Prevent closing while processing
    setOpen(newOpen);
    if (!newOpen) {
      resetState();
    }
  };

  const processFile = async (file: File) => {
    if (!file || !user || !db) return;

    const isCsv = file.name.endsWith('.csv');
    const isPdf = file.name.endsWith('.pdf');

    if (!isCsv && !isPdf) {
      toast({
        variant: "destructive",
        title: "Unsupported File Format",
        description: "Please upload a CSV or PDF statement."
      });
      return;
    }

    setUploading(true);
    setCurrentFile(file.name);
    setUploadSuccess(false);
    setLastMapping(null);
    setProcessingStatus('Initializing document upload...');

    const docId = Math.random().toString(36).substring(7);
    const type = isCsv ? 'csv' : 'pdf';

    try {
      const docRef = doc(db, 'users', user.uid, 'documents', docId);
      await setDoc(docRef, {
        id: docId,
        userId: user.uid,
        filename: file.name,
        fileType: type.toUpperCase(),
        uploadDate: new Date().toISOString(),
        status: 'processing'
      });

      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const chunks = content.split('\n\n').filter(Boolean);

          if (type === 'csv') {
            const rawLines = content.split('\n').filter(l => l.trim());
            const headerLine = rawLines[0];
            const headers = headerLine ? headerLine.split(',') : [];
            const dataLines = rawLines.slice(1);

            // 1. Check Redis cache for duplicate document fingerprint
            setProcessingStatus('⚡ Checking Redis cache for document fingerprint...');
            const contentHash = await hashDocumentContent(file.name + content);
            const cachedDoc = await getCachedDocument(contentHash);

            if (cachedDoc) {
              setProcessingStatus('⚡ Redis Cache Hit! Instantly importing mapped schema & records...');
              setLastMapping({
                ...cachedDoc.schemaMapping,
                explanation: `⚡ [Redis Cache Hit] ${cachedDoc.schemaMapping.explanation}`
              });

              for (let i = 0; i < cachedDoc.transactions.length; i++) {
                const tx = cachedDoc.transactions[i];
                const chunkId = Math.random().toString(36).substring(7);
                const chunkRef = doc(db, 'users', user.uid, 'documents', docId, 'chunks', chunkId);
                await setDoc(chunkRef, {
                  id: chunkId,
                  documentId: docId,
                  chunkText: `${tx.date},${tx.description},${tx.amount},${tx.category}`,
                  chunkOrder: i,
                  transactionDate: tx.date,
                  category: tx.category,
                  amount: tx.amount,
                  embeddingVector: [0]
                });
              }

              await setDoc(docRef, { status: 'ready' }, { merge: true });
              setUploadSuccess(true);
              setUploading(false);

              toast({
                title: "⚡ Instant Redis Cache Hit",
                description: `Retrieved schema mapping & transactions for "${file.name}" instantly from Redis cache.`
              });

              if (onUploadSuccess) {
                onUploadSuccess();
              }
              return;
            }

            // 2. OpenAI Schema Feature Mapping
            setProcessingStatus('🔍 Step 1/3: AI analyzing CSV structure & mapping column features...');
            const mapping = await mapCSVSchema({ 
              sampleLines: rawLines.slice(0, 6), 
              filename: file.name 
            });
            setLastMapping(mapping);

            const parsedTransactions = dataLines.map(line => {
              const fallback = parseCSVLine(line, headers);
              const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
              
              const rawDate = mapping.dateColumnIndex >= 0 ? parts[mapping.dateColumnIndex] : '';
              const rawDesc = mapping.descriptionColumnIndex >= 0 ? parts[mapping.descriptionColumnIndex] : '';
              const rawAmtStr = mapping.amountColumnIndex >= 0 ? parts[mapping.amountColumnIndex] : '';
              const rawCat = mapping.categoryColumnIndex >= 0 ? parts[mapping.categoryColumnIndex] : '';

              const parsedAmt = rawAmtStr ? parseFloat(rawAmtStr.replace(/[^0-9.-]/g, '')) : NaN;
              
              return {
                date: normalizeDateToISO(rawDate) || fallback.date,
                description: (rawDesc && !rawDesc.startsWith('TXN-') && !/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(rawDesc)) ? rawDesc : fallback.description,
                amount: (!isNaN(parsedAmt) && parsedAmt > 0) ? Math.abs(parsedAmt) : fallback.amount,
                category: rawCat || fallback.category
              };
            });

            // 3. AI Categorization
            setProcessingStatus('🧠 Step 2/3: AI categorizing transactions...');
            const descriptions = parsedTransactions.map(t => t.description).filter(Boolean);
            
            let results: { description: string, category: string }[] = [];
            if (descriptions.length > 0) {
              try {
                const response = await categorizeExpenses({ descriptions });
                results = response?.results || [];
              } catch (catErr) {
                console.error("Expense categorization failed, using default categories:", catErr);
              }
            }

            const finalTransactionsToCache: Array<{ date: string; description: string; amount: number; category: string }> = [];

            // 4. Indexing into Firestore and preparing cache
            setProcessingStatus('⚡ Step 3/3: Indexing records into database & caching in Redis...');
            for (let i = 0; i < parsedTransactions.length; i++) {
              const tx = parsedTransactions[i];
              const categoryResult = results.find(r => r.description === tx.description);
              const finalCategory = (tx.category && tx.category !== 'Miscellaneous') ? tx.category : (categoryResult?.category || 'Miscellaneous');
              const chunkId = Math.random().toString(36).substring(7);
              
              finalTransactionsToCache.push({
                date: tx.date,
                description: tx.description,
                amount: tx.amount,
                category: finalCategory
              });

              const chunkRef = doc(db, 'users', user.uid, 'documents', docId, 'chunks', chunkId);
              await setDoc(chunkRef, {
                id: chunkId,
                documentId: docId,
                chunkText: dataLines[i],
                chunkOrder: i,
                transactionDate: tx.date,
                category: finalCategory,
                amount: tx.amount,
                embeddingVector: [0]
              });
            }

            // Save document processing result in Redis cache
            await setCachedDocument({
              hash: contentHash,
              filename: file.name,
              schemaMapping: mapping,
              transactions: finalTransactionsToCache,
              cachedAt: new Date().toISOString()
            });

          } else {
            // PDF processing fallback
            setProcessingStatus('⚡ Processing & indexing document chunks...');
            for (let i = 0; i < chunks.length; i++) {
              const chunkId = Math.random().toString(36).substring(7);
              const chunkRef = doc(db, 'users', user.uid, 'documents', docId, 'chunks', chunkId);
              await setDoc(chunkRef, {
                id: chunkId,
                documentId: docId,
                chunkText: chunks[i],
                chunkOrder: i,
                embeddingVector: [0]
              });
            }
          }

          await setDoc(docRef, { status: 'ready' }, { merge: true });
          setUploadSuccess(true);
          
          toast({
            title: "File Mapped & Processed",
            description: `${file.name} successfully analyzed and indexed into your financial dashboard.`
          });

          if (onUploadSuccess) {
            onUploadSuccess();
          }

        } catch (procErr) {
          console.error("Error processing document content:", procErr);
          await setDoc(docRef, { status: 'failed' }, { merge: true });
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "There was an error mapping your document."
          });
        } finally {
          setUploading(false);
          setProcessingStatus('');
        }
      };

      reader.onerror = async (err) => {
        console.error("FileReader error:", err);
        await setDoc(docRef, { status: 'failed' }, { merge: true });
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "Failed to read the file."
        });
        setUploading(false);
        setProcessingStatus('');
      };

      reader.readAsText(file);

    } catch (error) {
      console.error("Error creating document record:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "There was an error initializing the upload."
      });
      setUploading(false);
      setProcessingStatus('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" className="gap-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary font-semibold shadow-xs transition-all">
            <UploadCloud className="w-4 h-4 text-primary" />
            <span>Upload File</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-xl text-primary border border-primary/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Upload Statement or Ledger</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Import CSV bank records or PDF statements directly into your dashboard.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Dropzone Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3",
              isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/40",
              uploading && "pointer-events-none opacity-80"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,.pdf"
              onChange={handleFileChange}
              disabled={uploading}
            />

            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-xs",
              uploadSuccess ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"
            )}>
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : uploadSuccess ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <FileUp className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold">
                {uploading 
                  ? "Processing and mapping document..." 
                  : uploadSuccess 
                  ? `Successfully imported "${currentFile}"` 
                  : "Click to browse or drag & drop"}
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: CSV (Bank statements) and PDF (Max 10MB)
              </p>
            </div>
          </div>

          {/* Real-time Status Notification */}
          {uploading && processingStatus && (
            <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-center gap-3 text-xs font-semibold text-primary animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span className="truncate">{processingStatus}</span>
            </div>
          )}

          {/* AI Schema Mapping / Redis Badge */}
          {lastMapping && (
            <div className="border border-primary/20 bg-gradient-to-r from-primary/5 via-purple-50/50 to-primary/5 p-3.5 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                {lastMapping.explanation.includes('Redis Cache Hit') ? (
                  <>
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-amber-800">⚡ Redis Cache Hit — Instant Document Import</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-primary">OpenAI Feature Schema Mapping Applied</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {lastMapping.explanation}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="bg-white border border-primary/20 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                  📅 Date: Col #{lastMapping.dateColumnIndex + 1}
                </span>
                <span className="bg-white border border-primary/20 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                  📝 Desc: Col #{lastMapping.descriptionColumnIndex + 1}
                </span>
                <span className="bg-white border border-primary/20 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                  💰 Amount: Col #{lastMapping.amountColumnIndex + 1}
                </span>
                {lastMapping.categoryColumnIndex >= 0 && (
                  <span className="bg-white border border-primary/20 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    🏷️ Category: Col #{lastMapping.categoryColumnIndex + 1}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            {uploadSuccess ? (
              <Button 
                onClick={() => handleOpenChange(false)} 
                className="w-full font-bold bg-primary hover:bg-primary/90 text-white"
              >
                Done — View Updated Dashboard
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={uploading}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
