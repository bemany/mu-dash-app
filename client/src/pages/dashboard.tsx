import React, { useState, useMemo } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { DataTable } from "@/components/ui/data-table";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { UberTrip, UberTransaction } from "@/lib/types";
import { processTripsAndTransactions, getMonthHeaders } from "@/lib/data-processor";
import { generateMockTrips, generateMockTransactions } from "@/lib/mock-data";
import { RefreshCw, CarFront, BadgeEuro, TrendingUp, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Fahrten",
  "Kalkulation",
  "Zahlungen",
  "Abgleich"
];

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [trips, setTrips] = useState<UberTrip[]>([]);
  const [transactions, setTransactions] = useState<UberTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Process data when trips or transactions change
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

  const loadMockData = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setTrips(generateMockTrips(2000));
      setTransactions(generateMockTransactions());
      setCurrentStep(4); // Jump to end for demo
      setIsProcessing(false);
    }, 800);
  };

  const handleTripsLoaded = (data: any[]) => {
    setIsProcessing(true);
    setTrips(data as UberTrip[]);
    setIsProcessing(false);
    setCurrentStep(2);
  };

  const handleTransactionsLoaded = (data: any[]) => {
    setIsProcessing(true);
    setTransactions(data as UberTransaction[]);
    setIsProcessing(false);
    setCurrentStep(4);
  };

  const reset = () => {
    setTrips([]);
    setTransactions([]);
    setCurrentStep(1);
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1920px] mx-auto space-y-8 pb-20">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Uber-Retter Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Verwalten Sie Ihre Werbeprämien und Bonusabrechnungen effizient.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadMockData} disabled={isProcessing} className="border-slate-200">
              <RefreshCw className={cn("w-4 h-4 mr-2", isProcessing && "animate-spin")} />
              Demo Daten laden
            </Button>
            {trips.length > 0 && (
              <Button variant="ghost" onClick={reset} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
                Zurücksetzen
              </Button>
            )}
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6">
          <Stepper currentStep={currentStep} steps={STEPS} />
        </div>

        {/* Phase 1: Upload Trips */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Willkommen beim Uber-Retter</h2>
              <p className="text-slate-500">Beginnen Sie mit dem Import Ihrer Fahrten-Daten.</p>
            </div>
            <FileUpload 
              onDataLoaded={handleTripsLoaded} 
              title="Fahrten Importieren"
              description="Ziehen Sie Ihre .csv Exportdatei hierher"
            />
          </div>
        )}

        {/* Phase 3: Upload Transactions */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Zahlungsabgleich</h2>
              <p className="text-slate-500">Importieren Sie jetzt Ihre Banktransaktionen für den Abgleich.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
              <FileUpload 
                onDataLoaded={handleTransactionsLoaded} 
                title="Zahlungen Importieren"
                description="CSV mit Kennzeichen, Datum und Betrag"
              />
              <div className="mt-8 flex justify-center">
                 <Button variant="ghost" onClick={() => setCurrentStep(4)} className="text-slate-400 hover:text-slate-600">
                   Diesen Schritt überspringen
                 </Button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2 & 4: Data Visualization */}
        {(currentStep === 2 || currentStep === 4) && trips.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard 
                title="Gesamtfahrten" 
                value={totals.trips.toLocaleString('de-DE')} 
                icon={<CarFront className="w-5 h-5 text-blue-500" />}
                bg="bg-blue-50/50"
              />
              <KpiCard 
                title="Theoretischer Bonus" 
                value={totals.bonus.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} 
                icon={<BadgeEuro className="w-5 h-5 text-purple-500" />}
                bg="bg-purple-50/50"
              />
              {currentStep === 4 && (
                <>
                  <KpiCard 
                    title="Bereits Ausgezahlt" 
                    value={totals.paid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} 
                    icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
                    className="text-emerald-700"
                    bg="bg-emerald-50/50"
                  />
                  <KpiCard 
                    title="Offener Betrag" 
                    value={totals.diff.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} 
                    icon={totals.diff > 0 ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    className={totals.diff > 0 ? "text-amber-600" : "text-emerald-600"}
                    bg={totals.diff > 0 ? "bg-amber-50/50" : "bg-emerald-50/50"}
                  />
                </>
              )}
            </div>

            {/* Action Bar for Phase 2 */}
            {currentStep === 2 && (
              <div className="flex justify-between items-center bg-emerald-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] bg-[position:0_0,0_0] animate-shine pointer-events-none" />
                
                <div className="relative z-10">
                  <h3 className="text-lg font-bold mb-1">Berechnung abgeschlossen</h3>
                  <p className="text-emerald-200 text-sm">Die theoretischen Boni basieren auf der Anzahl der Fahrten pro Monat.</p>
                </div>
                <Button 
                  onClick={() => setCurrentStep(3)} 
                  className="bg-white text-emerald-900 hover:bg-emerald-50 border-none relative z-10 font-semibold"
                  size="lg"
                >
                  Weiter zum Zahlungsabgleich
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Main Table */}
            <DataTable 
              summaries={summaries} 
              monthHeaders={monthHeaders} 
              totals={totals} 
              showDiff={currentStep === 4} 
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ title, value, icon, className, bg }: { title: string, value: string, icon: React.ReactNode, className?: string, bg?: string }) {
  return (
    <Card className={cn("border-slate-100 shadow-sm transition-all hover:shadow-md", bg)}>
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
