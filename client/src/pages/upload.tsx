import React, { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout";
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
import { 
  Upload, 
  FileUp, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  FolderOpen,
  X,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function UploadPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    vorgangsId: string | null;
    tripsAdded: number;
    transactionsAdded: number;
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.csv')
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        f => f.name.endsWith('.csv')
      );
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
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

  useEffect(() => {
    if (uploadResult) {
      const timer = setTimeout(() => {
        setLocation('/');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [uploadResult, setLocation]);

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
      setLocation('/');
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
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-emerald-800">{t('upload.uploadComplete')}</h2>
                <p className="text-emerald-700 mt-2">
                  {uploadResult.tripsAdded} {t('upload.trips')} • {uploadResult.transactionsAdded} {t('upload.payments')}
                </p>
                {uploadResult.vorgangsId && (
                  <div className="mt-4 bg-white rounded-lg p-4 inline-block border border-emerald-200">
                    <p className="text-sm text-slate-600">{t('performance.yourVorgangsId')}</p>
                    <p className="font-mono text-2xl font-bold text-emerald-700 tracking-wider">
                      {uploadResult.vorgangsId}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-sm text-emerald-600">{t('upload.redirecting')}</p>
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

              {files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-700">{t('upload.selectedFiles')} ({files.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200"
                        data-testid={`file-item-${index}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">{file.name}</p>
                            <p className="text-xs text-slate-400">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                          data-testid={`button-remove-file-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
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
