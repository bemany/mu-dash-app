import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout, useLayoutLoading } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useProgress } from "@/hooks/use-progress";
import { InlineProgress } from "@/components/ui/inline-progress";
import { useTranslation } from "@/i18n";
import { playNotificationSound } from "@/lib/notification-sound";
import { logger } from "@/lib/logger";
import Papa from "papaparse";
import { 
  Upload, 
  FileUp, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  FolderOpen,
  X,
  FileText,
  Car,
  CreditCard,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FilePreview {
  file: File;
  type: 'trips' | 'payments' | 'other' | 'unknown';
  rowCount: number;
  dateRange?: { from: string; to: string };
  companyName?: string;
  label?: string; // human-readable Bolt file type label
}

function GoToDashboardButton({ vorgangsId }: { vorgangsId: string | null }) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { setIsLoading } = useLayoutLoading();
  const queryClient = useQueryClient();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = async () => {
    console.log('[GoToDashboard] Button clicked, vorgangsId:', vorgangsId);
    
    if (!vorgangsId) {
      console.log('[GoToDashboard] No vorgangsId, navigating directly to /');
      setLocation('/');
      return;
    }
    
    setIsNavigating(true);
    setIsLoading(true);
    const startTime = Date.now();
    const MIN_LOADING_TIME = 800;
    
    try {
      console.log('[GoToDashboard] Calling /api/session/load...');
      const res = await fetch('/api/session/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vorgangsId }),
      });
      
      console.log('[GoToDashboard] Response status:', res.status, res.ok ? 'OK' : 'FAILED');
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('[GoToDashboard] Load failed:', errorData);
        setLocation('/');
        return;
      }
      
      const responseData = await res.json();
      console.log('[GoToDashboard] Success response:', responseData);
      
      console.log('[GoToDashboard] Invalidating session query...');
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      
      const newSessionData = await queryClient.fetchQuery({ 
        queryKey: ['session'],
        queryFn: async () => {
          const res = await fetch('/api/session');
          if (!res.ok) throw new Error('Failed to fetch session');
          return res.json();
        },
        staleTime: 0 
      });
      console.log('[GoToDashboard] New session data:', newSessionData);
      
      playNotificationSound();
      
      const elapsed = Date.now() - startTime;
      console.log('[GoToDashboard] Total load time:', elapsed, 'ms');
      if (elapsed < MIN_LOADING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
      }
      
      console.log('[GoToDashboard] Navigating to /');
      setLocation('/');
    } catch (err) {
      console.error('[GoToDashboard] Error loading session:', err);
      setLocation('/');
    } finally {
      console.log('[GoToDashboard] Load complete');
      setIsLoading(false);
      setIsNavigating(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isNavigating}
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
      data-testid="button-go-to-dashboard"
    >
      {t('upload.goToDashboard')}
    </Button>
  );
}

export default function UploadPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    vorgangsId: string | null;
    tripsAdded: number;
    transactionsAdded: number;
    dateRange?: { from: string; to: string };
  } | null>(null);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [loadVorgangsId, setLoadVorgangsId] = useState("");
  const [loadError, setLoadError] = useState("");

  const { progress } = useProgress();

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
  });

  useEffect(() => {
    logger.nav('Import page loaded');
    document.title = `${t('upload.title')} - MU-Dash`;
  }, [t]);

  const classifyHeader = (headerLine: string): { type: 'trips' | 'payments' | 'other' | 'unknown'; platform: 'uber' | 'bolt' | null; label?: string } => {
    const cleaned = headerLine.replace(/^\uFEFF/, '').trim();
    // Bolt trips: Kfz-Kennzeichen + Fahrtpreis
    if (cleaned.includes('Kfz-Kennzeichen') && cleaned.includes('Fahrtpreis')) {
      return { type: 'trips', platform: 'bolt' };
    }
    // Bolt driver revenue: Bruttoverdienst (insgesamt) + Fahrer:in
    if (cleaned.includes('Bruttoverdienst (insgesamt)') && cleaned.includes('Fahrer:in')) {
      return { type: 'other', platform: 'bolt', label: 'Umsatz pro Fahrer' };
    }
    // Bolt shifts: Gesamte Zeit online (Min.) + Schichtzeit
    if (cleaned.includes('Gesamte Zeit online (Min.)') && cleaned.includes('Schichtzeit')) {
      return { type: 'other', platform: 'bolt', label: 'Schichtprotokoll' };
    }
    // Bolt driver performance: Fahrer-Aktivität|%
    if (cleaned.includes('Fahrer') && cleaned.includes('Annahmequote') && cleaned.includes('Stornoquote')) {
      return { type: 'other', platform: 'bolt', label: 'Fahrer Performance' };
    }
    // Bolt vehicle performance: Fahrzeugmodellat + Kfz-Kennzeichen + Online-Zeit
    if (cleaned.includes('Fahrzeugmodellat') && cleaned.includes('Online-Zeit')) {
      return { type: 'other', platform: 'bolt', label: 'Fahrzeug Performance' };
    }
    // Bolt invoices: Rechnungs-Nr. + Fahrtpreis
    if (cleaned.includes('Rechnungs-Nr.') && cleaned.includes('Fahrtpreis')) {
      return { type: 'other', platform: 'bolt', label: 'Rechnungen' };
    }
    // Bolt campaign: Name der Kampagne
    if (cleaned.includes('Name der Kampagne') && cleaned.includes('Erzielter Umsatz')) {
      return { type: 'other', platform: 'bolt', label: 'Kampagnen' };
    }
    // Uber trips: Kennzeichen + Zeitpunkt der Fahrtbestellung
    if (cleaned.includes('Kennzeichen') && cleaned.includes('Zeitpunkt der Fahrtbestellung')) {
      return { type: 'trips', platform: 'uber' };
    }
    // Uber payments: Beschreibung or An dein Unternehmen gezahlt
    if (cleaned.includes('Beschreibung') || cleaned.includes('An dein Unternehmen gezahlt')) {
      return { type: 'payments', platform: 'uber' };
    }
    return { type: 'unknown', platform: null };
  };

  const extractCompanyName = (filename: string, platform: 'uber' | 'bolt' | null, rows: any[]): string | undefined => {
    // Both Uber and Bolt may have "Name des Unternehmens" in CSV data
    // (Uber payments, Bolt invoice files)
    const fromData = rows[0]?.['Name des Unternehmens'];
    if (fromData && fromData.trim()) return fromData.trim();

    if (platform === 'uber') {
      // Fallback: from filename e.g. "20240701-20240731-trip_activity-Straenflitzer_GmbH.csv"
      const match = filename.replace(/\.csv$/i, '').match(/-([^-]+)$/);
      if (match) return match[1].replace(/_/g, ' ');
    }
    // Bolt (or unrecognized Bolt files with platform=null): extract from filename
    // by stripping known report keywords and dates
    if (platform === 'bolt' || platform === null) {
      let name = filename.replace(/\.csv$/i, '');
      const boltKeywords = [
        'Fahrtenübersicht', 'Umsatz pro Fahrer_in', 'Fahrer_innen Performance',
        'Fahrzeuge Performance', 'Protokoll der Schichtaktivitäten', 'Kampagnenbericht',
      ];
      for (const kw of boltKeywords) {
        name = name.replace(kw, '');
      }
      // Remove date patterns: "1 Jan_ 2026", "2025-11", etc.
      name = name.replace(/\d{1,2}\s+\w+_?\s*\d{4}/g, '');
      name = name.replace(/\d{4}-\d{2}(-\d{2})?/g, '');
      // Clean leftover separators
      name = name.replace(/^[-_\s]+|[-_\s]+$/g, '').replace(/[-_]{2,}/g, '-').trim();
      if (name.length > 2) return name;
    }
    return undefined;
  };

  const extractDateFromRow = (row: any, platform: 'uber' | 'bolt' | null): Date | null => {
    if (platform === 'uber') {
      const timestamp = row['Zeitpunkt der Fahrtbestellung'];
      if (timestamp) {
        const d = new Date(timestamp);
        return isNaN(d.getTime()) ? null : d;
      }
    } else if (platform === 'bolt') {
      const timestamp = row['Datum'];
      if (timestamp) {
        // Bolt format: "2025-11-30 23:53"
        const d = new Date(timestamp.trim().replace(' ', 'T'));
        return isNaN(d.getTime()) ? null : d;
      }
    }
    return null;
  };

  const analyzeFiles = async (filesToAnalyze: File[]) => {
    logger.import(`Analyzing ${filesToAnalyze.length} files`, { data: filesToAnalyze.map(f => f.name) });
    setIsAnalyzing(true);
    const previews: FilePreview[] = [];

    for (const file of filesToAnalyze) {
      try {
        const content = await file.text();
        const firstLine = content.split('\n')[0] || '';

        const { type, platform } = classifyHeader(firstLine);

        const parsed = await new Promise<any[]>((resolve) => {
          Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: () => resolve([]),
          });
        });

        let dateRange: { from: string; to: string } | undefined;
        if (type === 'trips' && parsed.length > 0) {
          const dates = parsed
            .map((row: any) => extractDateFromRow(row, platform))
            .filter((d): d is Date => d !== null);

          if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
            dateRange = {
              from: minDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
              to: maxDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            };
          }
        }

        const companyName = extractCompanyName(file.name, platform, parsed);

        previews.push({
          file,
          type,
          rowCount: parsed.length,
          dateRange,
          companyName,
        });
      } catch (error) {
        previews.push({
          file,
          type: 'unknown',
          rowCount: 0,
        });
      }
    }

    logger.import(`Analysis complete`, { data: previews.map(p => ({ name: p.file.name, type: p.type, rows: p.rowCount })) });
    setFilePreviews(prev => [...prev, ...previews]);
    setIsAnalyzing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) {
      logger.ui('Drag over drop zone');
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    logger.ui('Drag left drop zone');
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.csv')
    );
    logger.import(`Files dropped: ${droppedFiles.length}`, { data: droppedFiles.map(f => f.name) });
    setFiles(prev => [...prev, ...droppedFiles]);
    analyzeFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        f => f.name.endsWith('.csv')
      );
      logger.import(`Files selected via picker: ${selectedFiles.length}`, { data: selectedFiles.map(f => f.name) });
      setFiles(prev => [...prev, ...selectedFiles]);
      analyzeFiles(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    const removedFile = filePreviews[index];
    logger.import(`File removed: ${removedFile?.file.name}`);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Split files into batches (max 5 files or 30MB per batch)
  const createBatches = (filesToUpload: File[]): File[][] => {
    const MAX_FILES_PER_BATCH = 5;
    const MAX_SIZE_PER_BATCH = 30 * 1024 * 1024; // 30MB
    
    const batches: File[][] = [];
    let currentBatch: File[] = [];
    let currentBatchSize = 0;
    
    for (const file of filesToUpload) {
      const wouldExceedFiles = currentBatch.length >= MAX_FILES_PER_BATCH;
      const wouldExceedSize = currentBatchSize + file.size > MAX_SIZE_PER_BATCH && currentBatch.length > 0;
      
      if (wouldExceedFiles || wouldExceedSize) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }
      
      currentBatch.push(file);
      currentBatchSize += file.size;
    }
    
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    return batches;
  };

  const uploadSingleBatch = async (batch: File[], batchNum: number, totalBatches: number): Promise<any> => {
    const batchSize = batch.reduce((sum, f) => sum + f.size, 0);
    const batchSizeMB = (batchSize / (1024 * 1024)).toFixed(2);
    
    logger.import(`Batch ${batchNum}/${totalBatches}: Uploading ${batch.length} files (${batchSizeMB} MB)`, { 
      data: batch.map(f => ({ name: f.name, sizeMB: (f.size / (1024 * 1024)).toFixed(2) })) 
    });
    
    const formData = new FormData();
    batch.forEach(file => {
      formData.append('files', file);
    });

    logger.api(`POST /api/upload - batch ${batchNum}/${totalBatches} (${batchSizeMB} MB)`);
    const startTime = Date.now();
    
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.api(`POST /api/upload - batch ${batchNum} response: ${res.status} ${res.ok ? 'OK' : 'FAILED'} (after ${elapsed}s)`);
    
    if (!res.ok) {
      const contentType = res.headers.get('content-type') || '';
      logger.error(`Batch ${batchNum} failed with status ${res.status}, content-type: ${contentType}`);
      
      if (res.status === 413) {
        logger.error('413 Request Entity Too Large - batch is too big');
        throw new Error(`Batch ${batchNum} zu groß (${batchSizeMB} MB). Server-Limit erreicht.`);
      }
      
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        logger.error('Non-JSON error response (first 500 chars):', text.substring(0, 500));
        throw new Error(`Server-Fehler ${res.status} bei Batch ${batchNum}.`);
      }
      
      const error = await res.json();
      logger.error('Batch upload failed with JSON error', error);
      throw new Error(error.error || `Batch ${batchNum} Upload fehlgeschlagen`);
    }

    return res.json();
  };

  const uploadMutation = useMutation({
    mutationFn: async (filesToUpload: File[]) => {
      const totalSize = filesToUpload.reduce((sum, f) => sum + f.size, 0);
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      
      logger.import(`Starting upload of ${filesToUpload.length} files (${totalSizeMB} MB total)`, { 
        data: filesToUpload.map(f => ({ 
          name: f.name, 
          size: f.size, 
          sizeMB: (f.size / (1024 * 1024)).toFixed(2) 
        })) 
      });
      
      const batches = createBatches(filesToUpload);
      logger.import(`Split into ${batches.length} batches`, { 
        data: batches.map((b, i) => ({ 
          batch: i + 1, 
          files: b.length, 
          sizeMB: (b.reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(2) 
        })) 
      });
      
      let totalTripsAdded = 0;
      let totalTransactionsAdded = 0;
      let vorgangsId: string | null = null;
      let dateRange: { from: string; to: string } | undefined;
      
      for (let i = 0; i < batches.length; i++) {
        setBatchProgress({ current: i + 1, total: batches.length });
        
        const result = await uploadSingleBatch(batches[i], i + 1, batches.length);
        
        totalTripsAdded += result.tripsAdded || 0;
        totalTransactionsAdded += result.transactionsAdded || 0;
        if (result.vorgangsId) vorgangsId = result.vorgangsId;
        if (result.dateRange) dateRange = result.dateRange;
        
        logger.import(`Batch ${i + 1}/${batches.length} complete: +${result.tripsAdded} trips, +${result.transactionsAdded} transactions`);
      }
      
      setBatchProgress(null);
      
      return {
        vorgangsId,
        tripsAdded: totalTripsAdded,
        transactionsAdded: totalTransactionsAdded,
        dateRange,
      };
    },
    onSuccess: (data) => {
      logger.import(`Upload successful!`, { data: { vorgangsId: data.vorgangsId, trips: data.tripsAdded, transactions: data.transactionsAdded } });
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ["session"] });
      playNotificationSound();
      
      toast({
        title: t('upload.success'),
        description: `${data.tripsAdded} ${t('upload.trips')}, ${data.transactionsAdded} ${t('upload.payments')}`,
      });
    },
    onError: (error: any) => {
      logger.error('Upload error', error);
      setBatchProgress(null);
      toast({
        variant: "destructive",
        title: t('upload.error'),
        description: error.message,
      });
    },
  });

  const resetForMoreData = () => {
    setUploadResult(null);
    setFiles([]);
    setFilePreviews([]);
  };

  const tripPreviews = filePreviews.filter(p => p.type === 'trips');
  const paymentPreviews = filePreviews.filter(p => p.type === 'payments');
  const totalTrips = tripPreviews.reduce((sum, p) => sum + p.rowCount, 0);
  const totalPayments = paymentPreviews.reduce((sum, p) => sum + p.rowCount, 0);
  
  const combinedTripDateRange = tripPreviews.length > 0 ? (() => {
    const allDates = tripPreviews.flatMap(p => p.dateRange ? [p.dateRange.from, p.dateRange.to] : []);
    if (allDates.length === 0) return null;
    return `${tripPreviews[0]?.dateRange?.from || ''} - ${tripPreviews[tripPreviews.length - 1]?.dateRange?.to || ''}`;
  })() : null;

  // Detect mixed company names across uploaded files
  // Group names that are substrings of each other (e.g. "YourRide GmbH" ⊂ "kb_18_Berlin Fleet YourRide GmbH")
  const rawCompanyNames = filePreviews
    .map(p => p.companyName)
    .filter((name): name is string => !!name);
  const uniqueNames = Array.from(new Set(rawCompanyNames));
  const companyGroups: string[][] = [];
  for (const name of uniqueNames) {
    const existing = companyGroups.find(group =>
      group.some(g => g.includes(name) || name.includes(g))
    );
    if (existing) {
      existing.push(name);
    } else {
      companyGroups.push([name]);
    }
  }
  const detectedCompanies = companyGroups.map(group =>
    group.reduce((a, b) => a.length > b.length ? a : b)
  );
  const hasMixedCompanies = detectedCompanies.length > 1;

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(files);
    } finally {
      setIsUploading(false);
    }
  };

  const loadSessionMutation = useMutation({
    mutationFn: async (vorgangsId: string) => {
      const res = await fetch("/api/session/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vorgangsId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Laden fehlgeschlagen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      playNotificationSound();
      setLoadDialogOpen(false);
      setLoadVorgangsId("");
    },
    onError: (error: any) => {
      setLoadError(error.message);
    },
  });

  const handleLoadSession = () => {
    if (!loadVorgangsId.trim()) return;
    setLoadError("");
    loadSessionMutation.mutate(loadVorgangsId.trim().toUpperCase());
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="upload-title">
              {t('upload.title')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('upload.subtitle')}
            </p>
          </div>
          <Button 
            data-testid="button-load-vorgang"
            variant="outline" 
            onClick={() => setLoadDialogOpen(true)}
            className="border-slate-200"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            {t('dashboard.loadProcess')}
          </Button>
        </div>

        {uploadResult ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-emerald-800">{t('upload.uploadComplete')}</h2>
                <p className="text-emerald-700 mt-2">
                  {uploadResult.tripsAdded.toLocaleString('de-DE')} {t('upload.trips')} • {uploadResult.transactionsAdded.toLocaleString('de-DE')} {t('upload.payments')}
                </p>
                {uploadResult.dateRange && (
                  <p className="text-emerald-600 text-sm mt-1">
                    {t('upload.dateRange')}: {uploadResult.dateRange.from} - {uploadResult.dateRange.to}
                  </p>
                )}
                {uploadResult.vorgangsId && (
                  <div className="mt-4 bg-white rounded-lg p-4 inline-block border border-emerald-200">
                    <p className="text-sm text-slate-600">{t('performance.yourVorgangsId')}</p>
                    <p className="font-mono text-2xl font-bold text-emerald-700 tracking-wider">
                      {uploadResult.vorgangsId}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={resetForMoreData}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  data-testid="button-add-more-data"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  {t('dashboard.addMoreData')}
                </Button>
                <GoToDashboardButton vorgangsId={uploadResult.vorgangsId} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                  isDragging
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-300 hover:border-emerald-400 hover:bg-slate-50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
                data-testid="drop-zone"
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-file"
                />
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileUp className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  {t('upload.dropZoneTitle')}
                </h3>
                <p className="text-slate-500 text-sm">
                  {t('upload.dropZoneSubtitle')}
                </p>
              </div>

              {filePreviews.length > 0 && (
                <div className="space-y-4">
                  {isAnalyzing && (
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {t('upload.analyzing')}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tripPreviews.length > 0 && (
                      <Card className="border-emerald-200 bg-emerald-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Car className="w-5 h-5 text-emerald-600" />
                              <span className="font-semibold text-slate-800">{t('upload.trips')}</span>
                            </div>
                            <span className="text-emerald-700 font-bold">
                              {totalTrips.toLocaleString('de-DE')} {t('upload.records')}
                            </span>
                          </div>
                          {combinedTripDateRange && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                              <Calendar className="w-4 h-4" />
                              <span>{t('upload.dateRange')}: {combinedTripDateRange}</span>
                            </div>
                          )}
                          <div className="space-y-1">
                            {tripPreviews.map((preview, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm bg-white rounded p-2 border border-emerald-100">
                                <span className="text-slate-600 truncate flex-1">{preview.file.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-emerald-600 font-medium">{preview.rowCount.toLocaleString('de-DE')}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(filePreviews.indexOf(preview))}
                                    className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {paymentPreviews.length > 0 && (
                      <Card className="border-blue-200 bg-blue-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-5 h-5 text-blue-600" />
                              <span className="font-semibold text-slate-800">{t('upload.payments')}</span>
                            </div>
                            <span className="text-blue-700 font-bold">
                              {totalPayments.toLocaleString('de-DE')} {t('upload.records')}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {paymentPreviews.map((preview, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm bg-white rounded p-2 border border-blue-100">
                                <span className="text-slate-600 truncate flex-1">{preview.file.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-600 font-medium">{preview.rowCount.toLocaleString('de-DE')}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(filePreviews.indexOf(preview))}
                                    className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-slate-100 rounded-lg p-3">
                    <span className="text-slate-600">{t('upload.readyToUpload')}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-emerald-700 font-semibold">{totalTrips.toLocaleString('de-DE')} {t('upload.trips')}</span>
                      <span className="text-blue-700 font-semibold">{totalPayments.toLocaleString('de-DE')} {t('upload.payments')}</span>
                    </div>
                  </div>

                  {hasMixedCompanies && (
                    <Alert className="bg-amber-50 border-amber-300">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        <strong>{t('upload.companyWarningTitle')}</strong>{' '}
                        {t('upload.companyWarningText')}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {detectedCompanies.map((name, i) => (
                            <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-900">
                              {name}
                            </span>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {(isUploading || progress.isActive) && (
                <div 
                  className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 shadow-sm"
                  data-testid="upload-progress-container"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">
                        {progress.phase === 'complete' ? t('upload.uploadComplete') : t('upload.processing')}
                      </h4>
                      <p className="text-sm text-slate-600">
                        {progress.message || t('upload.processing')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress.percent || 0}%` }}
                        data-testid="progress-bar-fill"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        {progress.processed > 0 ? (
                          <>
                            {progress.processed.toLocaleString('de-DE')} / {progress.total.toLocaleString('de-DE')} {t('upload.records')}
                          </>
                        ) : (
                          t('upload.processing')
                        )}
                      </span>
                      <span className="font-bold text-emerald-600" data-testid="progress-percent">
                        {progress.percent || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || isUploading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg"
                data-testid="button-upload"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    {batchProgress && batchProgress.total > 1 
                      ? `${t('upload.uploading')} (${batchProgress.current}/${batchProgress.total})`
                      : t('upload.uploading')
                    }
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    {t('upload.uploadButton')} ({files.length})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            {t('upload.hint')}
          </AlertDescription>
        </Alert>
      </div>

      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.loadProcess')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder={t('dashboard.enterVorgangsId')}
              value={loadVorgangsId}
              onChange={(e) => setLoadVorgangsId(e.target.value.toUpperCase())}
              className="font-mono text-lg tracking-wider text-center"
              maxLength={6}
              data-testid="input-load-vorgangs-id"
            />
            {loadError && (
              <p className="text-sm text-red-600 text-center">{loadError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleLoadSession}
              disabled={!loadVorgangsId.trim() || loadSessionMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-confirm-load"
            >
              {loadSessionMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                t('dashboard.loadProcess')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
