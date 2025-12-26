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
  type: 'trips' | 'payments' | 'unknown';
  rowCount: number;
  dateRange?: { from: string; to: string };
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
    document.title = `${t('upload.title')} - MU-Dash`;
  }, [t]);

  const analyzeFiles = async (filesToAnalyze: File[]) => {
    setIsAnalyzing(true);
    const previews: FilePreview[] = [];

    for (const file of filesToAnalyze) {
      try {
        const content = await file.text();
        const firstLine = content.split('\n')[0] || '';
        
        let type: 'trips' | 'payments' | 'unknown' = 'unknown';
        if (firstLine.includes('Kennzeichen') && firstLine.includes('Zeitpunkt der Fahrtbestellung')) {
          type = 'trips';
        } else if (firstLine.includes('Beschreibung') || firstLine.includes('An dein Unternehmen gezahlt')) {
          type = 'payments';
        }

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
            .map((row: any) => {
              const timestamp = row['Zeitpunkt der Fahrtbestellung'];
              if (timestamp) {
                const d = new Date(timestamp);
                return isNaN(d.getTime()) ? null : d;
              }
              return null;
            })
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

        previews.push({
          file,
          type,
          rowCount: parsed.length,
          dateRange,
        });
      } catch (error) {
        previews.push({
          file,
          type: 'unknown',
          rowCount: 0,
        });
      }
    }

    setFilePreviews(prev => [...prev, ...previews]);
    setIsAnalyzing(false);
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
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.csv')
    );
    setFiles(prev => [...prev, ...droppedFiles]);
    analyzeFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        f => f.name.endsWith('.csv')
      );
      setFiles(prev => [...prev, ...selectedFiles]);
      analyzeFiles(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMutation = useMutation({
    mutationFn: async (filesToUpload: File[]) => {
      const formData = new FormData();
      filesToUpload.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }

      return res.json();
    },
    onSuccess: (data) => {
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ["session"] });
      playNotificationSound();
      
      toast({
        title: t('upload.success'),
        description: `${data.tripsAdded} ${t('upload.trips')}, ${data.transactionsAdded} ${t('upload.payments')}`,
      });
    },
    onError: (error: any) => {
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
                    {t('upload.uploading')}
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
