import React, { useState, useMemo } from "react";
import { UnifiedUpload } from "@/components/ui/unified-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { DataTable } from "@/components/ui/data-table";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UberTrip, UberTransaction } from "@/lib/types";
import { processTripsAndTransactions, getMonthHeaders, analyzeTransactions, TransactionMatch } from "@/lib/data-processor";
import { generateMockTrips, generateMockTransactions } from "@/lib/mock-data";
import { RefreshCw, CarFront, BadgeEuro, ArrowRight, CheckCircle, AlertTriangle, Copy, Check, FolderOpen, Eye, CheckCircle2, XCircle, Plus, Upload, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProgress } from "@/hooks/use-progress";
import { InlineProgress } from "@/components/ui/inline-progress";
import { uploadInChunks, UploadProgress } from "@/lib/chunked-upload";
import { useTranslation } from "@/i18n";
import * as XLSX from "xlsx";

export default function Dashboard() {
  const { t } = useTranslation();
  
  const steps = [
    t('dashboard.steps.0'),
    t('dashboard.steps.1'),
    t('dashboard.steps.2')
  ];

  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingTrips, setPendingTrips] = useState<UberTrip[]>([]);
  const [pendingPayments, setPendingPayments] = useState<UberTransaction[]>([]);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [loadVorgangsId, setLoadVorgangsId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [copied, setCopied] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [transactionsDialogOpen, setTransactionsDialogOpen] = useState(false);
  const [addMoreDataDialogOpen, setAddMoreDataDialogOpen] = useState(false);
  const [additionalTrips, setAdditionalTrips] = useState<UberTrip[]>([]);
  const [additionalPayments, setAdditionalPayments] = useState<UberTransaction[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { data: sessionData, isLoading, isFetching } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
  });

  const { progress } = useProgress();
  const showProgress = isProcessing || progress.isActive || uploadProgress !== null;

  const currentStep = sessionData?.currentStep || 1;
  const trips = sessionData?.trips || [];
  const transactions = sessionData?.transactions || [];

  const updateStepMutation = useMutation({
    mutationFn: async (step: number) => {
      const res = await fetch("/api/session/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step }),
      });
      if (!res.ok) throw new Error("Failed to update step");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });

  const uploadTripsMutation = useMutation({
    mutationFn: async (trips: UberTrip[]) => {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trips }),
      });
      if (!res.ok) throw new Error("Failed to upload trips");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });

  const uploadTransactionsMutation = useMutation({
    mutationFn: async (transactions: UberTransaction[]) => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions }),
      });
      if (!res.ok) throw new Error("Failed to upload transactions");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });

  const resetSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/session/reset", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reset session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      setPendingTrips([]);
      setPendingPayments([]);
    },
  });

  const generateVorgangsIdMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/session/vorgangsid", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate Vorgangs-ID");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });

  const loadSessionMutation = useMutation({
    mutationFn: async (vorgangsId: string) => {
      const res = await fetch("/api/session/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vorgangsId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load session");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      setLoadDialogOpen(false);
      setLoadVorgangsId("");
      setLoadError("");
    },
    onError: (error: Error) => {
      setLoadError(error.message);
    },
  });

  const vorgangsId = sessionData?.vorgangsId;

  const copyVorgangsId = () => {
    if (vorgangsId) {
      navigator.clipboard.writeText(vorgangsId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLoadSession = () => {
    if (loadVorgangsId.trim()) {
      setLoadError("");
      loadSessionMutation.mutate(loadVorgangsId.trim());
    }
  };

  const { summaries, monthHeaders, totals, transactionAnalysis } = useMemo(() => {
    if (trips.length === 0) return { 
      summaries: [], 
      monthHeaders: [], 
      totals: { trips: 0, bonus: 0, paid: 0, diff: 0 },
      transactionAnalysis: { matched: [], unmatched: [] }
    };

    const processed = processTripsAndTransactions(trips, transactions);
    const months = getMonthHeaders(processed);
    
    const totalTrips = processed.reduce((acc, curr) => acc + curr.totalCount, 0);
    const totalBonus = processed.reduce((acc, curr) => acc + curr.totalBonus, 0);
    const totalPaid = processed.reduce((acc, curr) => acc + curr.totalPaid, 0);
    const totalDiff = processed.reduce((acc, curr) => acc + curr.totalDifference, 0);

    const knownPlates = new Set(processed.map(s => s.licensePlate));
    const analysis = analyzeTransactions(transactions, knownPlates);

    return { 
      summaries: processed, 
      monthHeaders: months, 
      totals: { trips: totalTrips, bonus: totalBonus, paid: totalPaid, diff: totalDiff },
      transactionAnalysis: analysis
    };
  }, [trips, transactions]);

  const loadMockData = async () => {
    setIsProcessing(true);
    const mockTrips = generateMockTrips(2000);
    const mockTransactions = generateMockTransactions();
    
    await uploadTripsMutation.mutateAsync(mockTrips);
    await uploadTransactionsMutation.mutateAsync(mockTransactions);
    await generateVorgangsIdMutation.mutateAsync();
    await updateStepMutation.mutateAsync(3);
    
    setIsProcessing(false);
  };

  const handleUnifiedUpload = (trips: UberTrip[], payments: UberTransaction[]) => {
    setPendingTrips(trips);
    setPendingPayments(payments);
  };

  const handleContinue = async () => {
    setIsProcessing(true);
    setUploadProgress(null);
    
    try {
      await generateVorgangsIdMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ["session"] });
      
      if (pendingTrips.length > 0) {
        await uploadInChunks(
          pendingTrips,
          '/api/trips',
          'trips',
          (progress) => setUploadProgress(progress),
          'trips'
        );
      }
      
      if (pendingPayments.length > 0) {
        await uploadInChunks(
          pendingPayments,
          '/api/transactions',
          'transactions',
          (progress) => setUploadProgress(progress),
          'transactions'
        );
      }
      
      await updateStepMutation.mutateAsync(2);
      queryClient.invalidateQueries({ queryKey: ["session"] });
      setPendingTrips([]);
      setPendingPayments([]);
      setIsTransitioning(true);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };
  
  // Reset transitioning state when data fetching completes
  React.useEffect(() => {
    if (isTransitioning && !isFetching) {
      setIsTransitioning(false);
    }
  }, [isTransitioning, isFetching]);

  const handleGoToAbgleich = async () => {
    setIsTransitioning(true);
    await updateStepMutation.mutateAsync(3);
  };

  const reset = async () => {
    if (confirm(t('dashboard.resetConfirm'))) {
      await resetSessionMutation.mutateAsync();
    }
  };

  const setCurrentStep = (step: number) => {
    updateStepMutation.mutate(step);
  };

  const handleAdditionalDataUpload = (trips: UberTrip[], payments: UberTransaction[]) => {
    setAdditionalTrips(trips);
    setAdditionalPayments(payments);
  };

  const handleAddMoreData = async () => {
    if (additionalTrips.length === 0 && additionalPayments.length === 0) return;
    
    setIsProcessing(true);
    setUploadProgress(null);
    
    try {
      if (additionalTrips.length > 0) {
        await uploadInChunks(
          additionalTrips,
          '/api/trips',
          'trips',
          (progress) => setUploadProgress(progress),
          'trips'
        );
      }
      
      if (additionalPayments.length > 0) {
        await uploadInChunks(
          additionalPayments,
          '/api/transactions',
          'transactions',
          (progress) => setUploadProgress(progress),
          'transactions'
        );
      }
      
      queryClient.invalidateQueries({ queryKey: ["session"] });
      setAdditionalTrips([]);
      setAdditionalPayments([]);
      setAddMoreDataDialogOpen(false);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  const canContinue = pendingTrips.length > 0 || trips.length > 0;

  const exportTransactionsToExcel = () => {
    const matchedData = transactionAnalysis.matched.map(item => ({
      'Kennzeichen': item.licensePlate,
      'Datum': item.transaction["Zeitpunkt"]?.split(' ')[0] || '-',
      'Betrag': typeof item.transaction["Betrag"] === 'number' ? item.transaction["Betrag"] : 0,
      'Status': 'Zugeordnet'
    }));
    
    const unmatchedData = transactionAnalysis.unmatched.map(item => ({
      'Kennzeichen': item.licensePlate || '(unbekannt)',
      'Datum': item.transaction["Zeitpunkt"]?.split(' ')[0] || '-',
      'Betrag': typeof item.transaction["Betrag"] === 'number' ? item.transaction["Betrag"] : 0,
      'Status': 'Nicht zugeordnet'
    }));
    
    const allData = [...matchedData, ...unmatchedData];
    const ws = XLSX.utils.json_to_sheet(allData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Zahlungen");
    XLSX.writeFile(wb, `Zahlungen_${vorgangsId || 'export'}.xlsx`);
  };

  const exportSummaryToExcel = () => {
    const data = summaries.map(s => {
      const row: Record<string, any> = {
        'Kennzeichen': s.licensePlate,
        'Gesamt Fahrten': s.totalCount,
        'Bonus': s.totalBonus,
      };
      if (currentStep === 3) {
        row['Gezahlt'] = s.totalPaid;
        row['Differenz'] = s.totalDifference;
      }
      monthHeaders.forEach(month => {
        const monthData = s.stats[month];
        if (monthData) {
          row[`${month} Fahrten`] = monthData.count;
          if (currentStep === 3) {
            row[`${month} Differenz`] = monthData.difference;
          }
        }
      });
      return row;
    });
    
    data.push({
      'Kennzeichen': 'GESAMT',
      'Gesamt Fahrten': totals.trips,
      'Bonus': totals.bonus,
      ...(currentStep === 3 ? { 'Gezahlt': totals.paid, 'Differenz': totals.diff } : {})
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auswertung");
    XLSX.writeFile(wb, `Auswertung_${vorgangsId || 'export'}.xlsx`);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen" data-testid="loading-spinner">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1920px] mx-auto space-y-4 pb-20">
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="shrink-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="dashboard-title">{t('dashboard.title')}</h1>
            <p className="text-slate-500 text-sm mt-1">{t('dashboard.subtitle')}</p>
          </div>
          
          <div className="flex-1 max-w-xl">
            <Stepper currentStep={currentStep} steps={steps} />
          </div>
          
          <div className="flex gap-3 shrink-0">
            <Button 
              data-testid="button-load-vorgang"
              variant="outline" 
              onClick={() => setLoadDialogOpen(true)}
              className="border-slate-200"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              {t('dashboard.loadProcess')}
            </Button>
            {(currentStep === 2 || currentStep === 3) && trips.length > 0 && (
              <Button 
                data-testid="button-add-more-data"
                variant="outline" 
                onClick={() => setAddMoreDataDialogOpen(true)}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboard.addMoreData')}
              </Button>
            )}
            {(trips.length > 0 || pendingTrips.length > 0) && (
              <Button 
                data-testid="button-reset"
                variant="ghost" 
                onClick={reset} 
                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
              >
                {t('dashboard.reset')}
              </Button>
            )}
          </div>
        </div>

        {isTransitioning && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
            <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-lg font-medium text-slate-700">{t('dashboard.loadingData')}</p>
            <p className="text-sm text-slate-500 mt-1">{t('dashboard.pleaseWait')}</p>
          </div>
        )}

        {!isTransitioning && currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-4">
              <div className="space-y-4">
                <UnifiedUpload 
                  onDataLoaded={handleUnifiedUpload}
                  testId="unified-upload"
                  compact={true}
                />
              </div>
              
              <div className="lg:sticky lg:top-4 lg:self-start">
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-1">{t('dashboard.status')}</h3>
                      <div className="flex items-center gap-2 text-sm">
                        {canContinue ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-700">{t('dashboard.readyToProcess')}</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-500">{t('dashboard.awaitingFiles')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {(pendingTrips.length > 0 || pendingPayments.length > 0) && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-emerald-700">{pendingTrips.length.toLocaleString('de-DE')}</p>
                          <p className="text-xs text-emerald-600">{t('upload.trips')}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-purple-700">{pendingPayments.length.toLocaleString('de-DE')}</p>
                          <p className="text-xs text-purple-600">{t('upload.payments')}</p>
                        </div>
                      </div>
                    )}

                    {vorgangsId && isProcessing && (
                      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-3 rounded-lg border border-emerald-200">
                        <p className="text-xs font-medium text-slate-600 mb-1">{t('dashboard.yourProcessId')}</p>
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-mono text-lg font-bold text-emerald-700 tracking-wider"
                            data-testid="text-vorgangs-id-upload"
                          >
                            {vorgangsId}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={copyVorgangsId}
                            className="h-7 px-2"
                            data-testid="button-copy-vorgangs-id-upload"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    {uploadProgress && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>{uploadProgress.phase === 'trips' ? t('dashboard.uploadingTrips') : t('dashboard.uploadingPayments')}</span>
                          <span>{uploadProgress.percent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress.percent}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 text-center">
                          {uploadProgress.current.toLocaleString('de-DE')} / {uploadProgress.total.toLocaleString('de-DE')}
                        </p>
                      </div>
                    )}

                    <InlineProgress progress={progress} />

                    <Button 
                      data-testid="button-continue"
                      onClick={handleContinue}
                      disabled={!canContinue || isProcessing}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          {t('dashboard.processing')}
                        </>
                      ) : (
                        <>
                          {t('dashboard.continue')}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {!isTransitioning && (currentStep === 2 || currentStep === 3) && trips.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {vorgangsId && (
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{t('dashboard.yourProcessId')}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t('dashboard.noteProcessIdLater')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span 
                      className="font-mono text-2xl font-bold text-emerald-700 tracking-widest bg-white px-4 py-2 rounded-lg border border-emerald-200"
                      data-testid="text-vorgangs-id"
                    >
                      {vorgangsId}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyVorgangsId}
                      className="border-emerald-300 hover:bg-emerald-100"
                      data-testid="button-copy-vorgangs-id"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-1 text-emerald-600" />
                          {t('dashboard.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          {t('dashboard.copy')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard 
                title={t('dashboard.totalTrips')} 
                value={totals.trips.toLocaleString('de-DE')} 
                icon={<CarFront className="w-5 h-5 text-blue-500" />}
                bg="bg-blue-50/50"
                testId="kpi-trips"
              />
              <KpiCard 
                title={t('dashboard.theoreticalBonus')} 
                value={totals.bonus.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} 
                icon={<BadgeEuro className="w-5 h-5 text-purple-500" />}
                bg="bg-purple-50/50"
                testId="kpi-bonus"
              />
              {currentStep === 3 && (
                <>
                  <KpiCard 
                    title={t('dashboard.alreadyPaid')} 
                    value={totals.paid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} 
                    icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
                    className="text-emerald-700"
                    bg="bg-emerald-50/50"
                    testId="kpi-paid"
                  />
                  <KpiCard 
                    title={t('dashboard.openAmount')} 
                    value={totals.diff.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} 
                    icon={totals.diff > 0 ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    className={totals.diff > 0 ? "text-amber-600" : "text-emerald-600"}
                    bg={totals.diff > 0 ? "bg-amber-50/50" : "bg-emerald-50/50"}
                    testId="kpi-diff"
                  />
                </>
              )}
            </div>

            {currentStep === 2 && (
              <div className="flex justify-between items-center bg-emerald-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] bg-[position:0_0,0_0] animate-shine pointer-events-none" />
                
                <div className="relative z-10">
                  <h3 className="text-lg font-bold mb-1">{t('dashboard.calculationComplete')}</h3>
                  <p className="text-emerald-200 text-sm">{t('dashboard.calculationSubtitle')}</p>
                </div>
                <Button 
                  data-testid="button-go-to-abgleich"
                  onClick={handleGoToAbgleich} 
                  className="bg-white text-emerald-900 hover:bg-emerald-50 border-none relative z-10 font-semibold"
                  size="lg"
                  disabled={updateStepMutation.isPending}
                >
                  {updateStepMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {t('dashboard.processing')}
                    </>
                  ) : (
                    <>
                      {t('dashboard.continueToComparison')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportSummaryToExcel}
                data-testid="button-export-summary"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('dashboard.exportExcel')}
              </Button>
            </div>

            <DataTable 
              summaries={summaries} 
              monthHeaders={monthHeaders} 
              totals={totals} 
              showDiff={currentStep === 3} 
            />

            {currentStep === 3 && transactions.length > 0 && (
              <div className="flex justify-center mt-6">
                <Button
                  data-testid="button-view-transactions"
                  variant="outline"
                  onClick={() => setTransactionsDialogOpen(true)}
                  className="border-slate-300"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {t('dashboard.viewPayments')} ({transactionAnalysis.matched.length} {t('dashboard.assigned')}, {transactionAnalysis.unmatched.length} {t('dashboard.notAssigned')})
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={loadDialogOpen} onOpenChange={(open) => {
        if (!loadSessionMutation.isPending) {
          setLoadDialogOpen(open);
          if (!open) {
            setLoadVorgangsId("");
            setLoadError("");
          }
        }
      }}>
        <DialogContent className="sm:max-w-md">
          {loadSessionMutation.isPending ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-800">{t('dashboard.loadProcessDialog.loading')}</p>
                <p className="text-sm text-slate-500 mt-1">{t('dashboard.loadProcessDialog.processId')}: {loadVorgangsId}</p>
              </div>
              <div className="w-full max-w-xs bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('dashboard.loadProcessDialog.title')}</DialogTitle>
                <DialogDescription>
                  {t('dashboard.loadProcessDialog.description')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder={t('dashboard.loadProcessDialog.placeholder')}
                  value={loadVorgangsId}
                  onChange={(e) => setLoadVorgangsId(e.target.value.toUpperCase())}
                  className="font-mono text-center text-xl tracking-widest"
                  maxLength={6}
                  data-testid="input-load-vorgangs-id"
                />
                {loadError && (
                  <p className="text-sm text-red-600 text-center" data-testid="text-load-error">
                    {loadError}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLoadDialogOpen(false);
                    setLoadVorgangsId("");
                    setLoadError("");
                  }}
                >
                  {t('dashboard.loadProcessDialog.cancel')}
                </Button>
                <Button
                  onClick={handleLoadSession}
                  disabled={!loadVorgangsId.trim() || loadSessionMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid="button-confirm-load"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  {t('dashboard.loadProcessDialog.load')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={transactionsDialogOpen} onOpenChange={setTransactionsDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('dashboard.transactionsDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.transactionsDialog.assignedPayments')} / {t('dashboard.transactionsDialog.unassignedPayments')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-6 py-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-emerald-800">{t('dashboard.transactionsDialog.assignedPayments')} ({transactionAnalysis.matched.length})</h3>
              </div>
              {transactionAnalysis.matched.length > 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-emerald-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-emerald-800">{t('dashboard.transactionsDialog.licensePlate')}</th>
                        <th className="px-3 py-2 text-left font-medium text-emerald-800">{t('dashboard.transactionsDialog.date')}</th>
                        <th className="px-3 py-2 text-right font-medium text-emerald-800">{t('dashboard.transactionsDialog.amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-200">
                      {transactionAnalysis.matched.slice(0, 50).map((item, i) => (
                        <tr key={i} className="hover:bg-emerald-100/50">
                          <td className="px-3 py-2 font-mono">{item.licensePlate}</td>
                          <td className="px-3 py-2">{item.transaction["Zeitpunkt"]?.split(' ')[0] || '-'}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {(typeof item.transaction["Betrag"] === 'number' ? item.transaction["Betrag"] : 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {transactionAnalysis.matched.length > 50 && (
                    <p className="px-3 py-2 text-xs text-emerald-600 bg-emerald-100">
                      ... +{transactionAnalysis.matched.length - 50}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">{t('dashboard.transactionsDialog.noAssignedPayments')}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800">{t('dashboard.transactionsDialog.unassignedPayments')} ({transactionAnalysis.unmatched.length})</h3>
              </div>
              {transactionAnalysis.unmatched.length > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-amber-800">{t('dashboard.transactionsDialog.licensePlate')}</th>
                        <th className="px-3 py-2 text-left font-medium text-amber-800">{t('dashboard.transactionsDialog.date')}</th>
                        <th className="px-3 py-2 text-right font-medium text-amber-800">{t('dashboard.transactionsDialog.amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-200">
                      {transactionAnalysis.unmatched.slice(0, 50).map((item, i) => (
                        <tr key={i} className="hover:bg-amber-100/50">
                          <td className="px-3 py-2 font-mono">{item.licensePlate || '(unbekannt)'}</td>
                          <td className="px-3 py-2">{item.transaction["Zeitpunkt"]?.split(' ')[0] || '-'}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {(typeof item.transaction["Betrag"] === 'number' ? item.transaction["Betrag"] : 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {transactionAnalysis.unmatched.length > 50 && (
                    <p className="px-3 py-2 text-xs text-amber-600 bg-amber-100">
                      ... +{transactionAnalysis.unmatched.length - 50}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">{t('dashboard.transactionsDialog.noUnassignedPayments')}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button 
              variant="outline" 
              onClick={exportTransactionsToExcel}
              data-testid="button-export-transactions"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('dashboard.exportExcel')}
            </Button>
            <Button onClick={() => setTransactionsDialogOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addMoreDataDialogOpen} onOpenChange={(open) => {
        if (!isProcessing) {
          setAddMoreDataDialogOpen(open);
          if (!open) {
            setAdditionalTrips([]);
            setAdditionalPayments([]);
          }
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('dashboard.addMoreData')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.addMoreDataDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            <UnifiedUpload 
              onDataLoaded={handleAdditionalDataUpload}
              testId="additional-upload"
            />
            
            {uploadProgress && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                <div className="flex justify-between text-sm text-slate-600 mb-2">
                  <span>
                    {uploadProgress.phase === 'trips' ? t('dashboard.uploadingTrips') : t('dashboard.uploadingPayments')}
                  </span>
                  <span>{uploadProgress.current.toLocaleString('de-DE')} / {uploadProgress.total.toLocaleString('de-DE')}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddMoreDataDialogOpen(false);
                setAdditionalTrips([]);
                setAdditionalPayments([]);
              }}
              disabled={isProcessing}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddMoreData}
              disabled={isProcessing || (additionalTrips.length === 0 && additionalPayments.length === 0)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t('dashboard.processing')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('dashboard.addMoreData')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function KpiCard({ title, value, icon, className, bg, testId }: { title: string, value: string, icon: React.ReactNode, className?: string, bg?: string, testId?: string }) {
  return (
    <Card className={cn("border-slate-100 shadow-sm transition-all hover:shadow-md", bg)} data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-4">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="p-2 bg-white rounded-lg shadow-sm ring-1 ring-slate-100">{icon}</div>
        </div>
        <div className="flex items-end justify-between">
          <div className={cn("text-3xl font-bold text-slate-800 tracking-tight", className)}>{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}
