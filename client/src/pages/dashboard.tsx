import React, { useState, useMemo } from "react";
import { UnifiedUpload } from "@/components/ui/unified-upload";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { DataTable } from "@/components/ui/data-table";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { UberTrip, UberTransaction } from "@/lib/types";
import { processTripsAndTransactions, getMonthHeaders } from "@/lib/data-processor";
import { generateMockTrips, generateMockTransactions } from "@/lib/mock-data";
import { RefreshCw, CarFront, BadgeEuro, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProgress } from "@/hooks/use-progress";
import { InlineProgress } from "@/components/ui/inline-progress";

const STEPS = [
  "Daten Import",
  "Kalkulation",
  "Abgleich"
];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingTrips, setPendingTrips] = useState<UberTrip[]>([]);
  const [pendingPayments, setPendingPayments] = useState<UberTransaction[]>([]);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
  });

  const { progress } = useProgress();
  const showProgress = isProcessing || progress.isActive;

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

  const { summaries, monthHeaders, totals } = useMemo(() => {
    if (trips.length === 0) return { summaries: [], monthHeaders: [], totals: { trips: 0, bonus: 0, paid: 0, diff: 0 } };

    const processed = processTripsAndTransactions(trips, transactions);
    const months = getMonthHeaders(processed);
    
    const totalTrips = processed.reduce((acc, curr) => acc + curr.totalCount, 0);
    const totalBonus = processed.reduce((acc, curr) => acc + curr.totalBonus, 0);
    const totalPaid = processed.reduce((acc, curr) => acc + curr.totalPaid, 0);
    const totalDiff = processed.reduce((acc, curr) => acc + curr.totalDifference, 0);

    return { 
      summaries: processed, 
      monthHeaders: months, 
      totals: { trips: totalTrips, bonus: totalBonus, paid: totalPaid, diff: totalDiff } 
    };
  }, [trips, transactions]);

  const loadMockData = async () => {
    setIsProcessing(true);
    const mockTrips = generateMockTrips(2000);
    const mockTransactions = generateMockTransactions();
    
    await uploadTripsMutation.mutateAsync(mockTrips);
    await uploadTransactionsMutation.mutateAsync(mockTransactions);
    await updateStepMutation.mutateAsync(3);
    
    setIsProcessing(false);
  };

  const handleUnifiedUpload = (trips: UberTrip[], payments: UberTransaction[]) => {
    setPendingTrips(trips);
    setPendingPayments(payments);
  };

  const handleContinue = async () => {
    setIsProcessing(true);
    
    if (pendingTrips.length > 0) {
      await uploadTripsMutation.mutateAsync(pendingTrips);
    }
    
    if (pendingPayments.length > 0) {
      await uploadTransactionsMutation.mutateAsync(pendingPayments);
    }
    
    await updateStepMutation.mutateAsync(2);
    setPendingTrips([]);
    setPendingPayments([]);
    setIsProcessing(false);
  };

  const handleGoToAbgleich = async () => {
    await updateStepMutation.mutateAsync(3);
  };

  const reset = async () => {
    if (confirm("Möchten Sie wirklich alle Daten zurücksetzen?")) {
      await resetSessionMutation.mutateAsync();
    }
  };

  const setCurrentStep = (step: number) => {
    updateStepMutation.mutate(step);
  };

  const canContinue = pendingTrips.length > 0 || trips.length > 0;

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
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="dashboard-title">Uber-Retter Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Verwalten Sie Ihre Werbeprämien und Bonusabrechnungen effizient.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              data-testid="button-load-demo"
              variant="outline" 
              onClick={loadMockData} 
              disabled={isProcessing} 
              className="border-slate-200"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isProcessing && "animate-spin")} />
              Demo Daten laden
            </Button>
            {(trips.length > 0 || pendingTrips.length > 0) && (
              <Button 
                data-testid="button-reset"
                variant="ghost" 
                onClick={reset} 
                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
              >
                Zurücksetzen
              </Button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6">
          <Stepper currentStep={currentStep} steps={STEPS} />
        </div>

        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-8 mt-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-2" data-testid="step1-title">Willkommen beim Uber-Retter</h2>
              <p className="text-slate-500">Laden Sie alle CSV-Dateien auf einmal hoch - Fahrten und Zahlungen werden automatisch erkannt.</p>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <UnifiedUpload 
                onDataLoaded={handleUnifiedUpload}
                testId="unified-upload"
              />
            </div>
            
            <div className="flex flex-col items-center mt-8 gap-4 max-w-3xl mx-auto">
              <Button 
                data-testid="button-continue"
                onClick={handleContinue}
                disabled={!canContinue || isProcessing}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verarbeite...
                  </>
                ) : (
                  <>
                    Weiter
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              
              <div className="w-full">
                <InlineProgress progress={progress} />
              </div>
            </div>
          </div>
        )}

        {(currentStep === 2 || currentStep === 3) && trips.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard 
                title="Gesamtfahrten" 
                value={totals.trips.toLocaleString('de-DE')} 
                icon={<CarFront className="w-5 h-5 text-blue-500" />}
                bg="bg-blue-50/50"
                testId="kpi-trips"
              />
              <KpiCard 
                title="Theoretischer Bonus" 
                value={totals.bonus.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} 
                icon={<BadgeEuro className="w-5 h-5 text-purple-500" />}
                bg="bg-purple-50/50"
                testId="kpi-bonus"
              />
              {currentStep === 3 && (
                <>
                  <KpiCard 
                    title="Bereits Ausgezahlt" 
                    value={totals.paid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} 
                    icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
                    className="text-emerald-700"
                    bg="bg-emerald-50/50"
                    testId="kpi-paid"
                  />
                  <KpiCard 
                    title="Offener Betrag" 
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
                  <h3 className="text-lg font-bold mb-1">Berechnung abgeschlossen</h3>
                  <p className="text-emerald-200 text-sm">Die theoretischen Boni basieren auf der Anzahl der Fahrten pro Monat.</p>
                </div>
                <Button 
                  data-testid="button-go-to-abgleich"
                  onClick={handleGoToAbgleich} 
                  className="bg-white text-emerald-900 hover:bg-emerald-50 border-none relative z-10 font-semibold"
                  size="lg"
                >
                  Weiter zum Abgleich
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            <DataTable 
              summaries={summaries} 
              monthHeaders={monthHeaders} 
              totals={totals} 
              showDiff={currentStep === 3} 
            />
          </div>
        )}
      </div>
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
