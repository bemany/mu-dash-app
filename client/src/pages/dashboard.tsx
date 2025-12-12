import React, { useState, useMemo } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UberTrip, UberTransaction, DriverSummary } from "@/lib/types";
import { processTripsAndTransactions, getMonthHeaders, formatMonthHeader } from "@/lib/data-processor";
import { generateMockTrips, generateMockTransactions } from "@/lib/mock-data";
import { Download, RefreshCw, CarFront, BadgeEuro, TrendingUp, ArrowRight, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Fahrten hochladen",
  "Theoretische Auszahlung",
  "Zahlungen hochladen",
  "Abgleich & Finale"
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

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const reset = () => {
    setTrips([]);
    setTransactions([]);
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-[1800px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Uber Umsatz Manager</h1>
            <p className="text-slate-500 mt-1">Werbeprämien & Bonus Abrechnung</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadMockData} disabled={isProcessing}>
              <RefreshCw className={cn("w-4 h-4 mr-2", isProcessing && "animate-spin")} />
              Demo Daten
            </Button>
            {trips.length > 0 && (
              <Button variant="ghost" onClick={reset} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Stepper Navigation */}
        <Stepper currentStep={currentStep} steps={STEPS} />

        {/* Phase 1: Upload Trips */}
        {currentStep === 1 && (
          <div className="max-w-xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-lg bg-white">
              <CardHeader>
                <CardTitle>Schritt 1: Fahrten Importieren</CardTitle>
                <CardDescription>Laden Sie die Uber-Fahrten export Datei (.csv) hoch.</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload 
                  onDataLoaded={handleTripsLoaded} 
                  title="Fahrten-Datei hier ablegen"
                  description="Ziehen Sie die CSV-Datei hierher oder klicken Sie zum Auswählen."
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Phase 3: Upload Transactions */}
        {currentStep === 3 && (
          <div className="max-w-xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-lg bg-white">
              <CardHeader>
                <CardTitle>Schritt 3: Zahlungen Importieren</CardTitle>
                <CardDescription>Laden Sie die Bank-Transaktionen oder Zahlungsbelege hoch (.csv).</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload 
                  onDataLoaded={handleTransactionsLoaded} 
                  title="Zahlungs-Datei hier ablegen"
                  description="Diese Datei sollte Kennzeichen, Datum und Betrag enthalten."
                />
                <div className="mt-4 flex justify-end">
                   <Button variant="ghost" onClick={() => setCurrentStep(4)}>Überspringen (Keine Zahlungsdaten)</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Phase 2 & 4: Data Visualization */}
        {(currentStep === 2 || currentStep === 4) && trips.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KpiCard 
                title="Gesamtfahrten" 
                value={totals.trips.toLocaleString('de-DE')} 
                icon={<CarFront className="w-5 h-5 text-blue-600" />}
              />
              <KpiCard 
                title="Theoretischer Bonus" 
                value={totals.bonus.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} 
                icon={<BadgeEuro className="w-5 h-5 text-slate-600" />}
              />
              {currentStep === 4 && (
                <>
                  <KpiCard 
                    title="Bereits Ausgezahlt" 
                    value={totals.paid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} 
                    icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
                    className="text-emerald-700"
                  />
                  <KpiCard 
                    title="Offener Betrag" 
                    value={totals.diff.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} 
                    icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
                    className={totals.diff > 0 ? "text-amber-600" : "text-emerald-600"}
                  />
                </>
              )}
            </div>

            {/* Action Bar for Phase 2 */}
            {currentStep === 2 && (
              <div className="flex justify-end bg-blue-50 p-4 rounded-lg border border-blue-100 items-center gap-4">
                <p className="text-blue-800 text-sm font-medium">Die theoretischen Boni wurden berechnet based auf der Fahrtenanzahl.</p>
                <Button onClick={() => setCurrentStep(3)}>
                  Weiter zu Zahlungen
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Main Table */}
            <Card className="border-none shadow-md overflow-hidden bg-white">
              <CardHeader className="pb-2">
                <CardTitle>Fahrzeug Abrechnung</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
                      <tr>
                        <th className="px-6 py-4 font-semibold sticky left-0 bg-slate-50 z-20 border-b border-slate-200">Kennzeichen</th>
                        {monthHeaders.map(month => (
                          <th key={month} colSpan={currentStep === 4 ? 3 : 2} className="px-4 py-3 text-center border-l border-b border-slate-200">
                            {formatMonthHeader(month)}
                          </th>
                        ))}
                        <th colSpan={currentStep === 4 ? 3 : 2} className="px-4 py-3 text-center border-l border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                          Gesamt
                        </th>
                      </tr>
                      <tr>
                        <th className="px-6 py-2 sticky left-0 bg-slate-50 z-20 border-b border-slate-200"></th>
                        {monthHeaders.map(month => (
                          <React.Fragment key={month + '-sub'}>
                            <th className="px-2 py-2 text-center text-[10px] text-slate-400 border-l border-b border-slate-200 w-16">Fahrten</th>
                            <th className="px-2 py-2 text-center text-[10px] text-slate-400 border-b border-slate-200 w-20">Soll</th>
                            {currentStep === 4 && (
                              <th className="px-2 py-2 text-center text-[10px] text-slate-400 border-b border-slate-200 w-20 bg-slate-50/50">Diff</th>
                            )}
                          </React.Fragment>
                        ))}
                        {/* Totals Subheaders */}
                        <th className="px-2 py-2 text-center text-[10px] text-slate-500 border-l border-b border-slate-200 bg-slate-100">Fahrten</th>
                        <th className="px-2 py-2 text-center text-[10px] text-slate-500 border-b border-slate-200 bg-slate-100">Soll</th>
                        {currentStep === 4 && (
                           <th className="px-2 py-2 text-center text-[10px] text-slate-500 border-b border-slate-200 bg-slate-100">Diff</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summaries.map((driver) => (
                        <tr key={driver.licensePlate} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-3 font-medium text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50/80 z-10 whitespace-nowrap border-r border-transparent shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            {driver.licensePlate}
                          </td>
                          {monthHeaders.map(month => {
                            const stat = driver.stats[month];
                            const count = stat?.count || 0;
                            const bonus = stat?.bonus || 0;
                            const diff = stat?.difference || 0;
                            
                            // Visual logic for difference
                            // If diff > 0: Underpaid (Driver owed money) -> Warning/Red
                            // If diff < 0: Overpaid (Driver paid too much) -> Info/Blue
                            // If diff == 0: Perfect -> Green/Muted
                            
                            let diffColor = "text-slate-300";
                            if (diff > 0) diffColor = "text-amber-600 font-bold bg-amber-50";
                            if (diff < 0) diffColor = "text-blue-600 font-medium";
                            if (diff === 0 && bonus > 0) diffColor = "text-emerald-600 bg-emerald-50";

                            return (
                              <React.Fragment key={month + driver.licensePlate}>
                                <td className={cn(
                                  "px-2 py-3 text-center border-l border-slate-100 font-mono text-xs",
                                  count === 0 ? "text-slate-200" : "text-slate-600"
                                )}>
                                  {count > 0 ? count : "-"}
                                </td>
                                <td className={cn(
                                  "px-2 py-3 text-center font-mono font-medium text-xs",
                                  bonus > 0 ? "text-slate-700" : "text-slate-200"
                                )}>
                                  {bonus > 0 ? bonus : "-"}
                                </td>
                                {currentStep === 4 && (
                                  <td className={cn("px-2 py-3 text-center font-mono text-xs border-r border-slate-50", diffColor)}>
                                    {bonus > 0 || diff !== 0 ? diff : "-"}
                                  </td>
                                )}
                              </React.Fragment>
                            );
                          })}
                           {/* Row Totals */}
                           <td className="px-2 py-3 text-center border-l border-slate-200 bg-slate-50/50 font-mono font-semibold text-slate-700 text-xs">
                              {driver.totalCount}
                           </td>
                           <td className="px-2 py-3 text-center bg-slate-50/50 font-mono font-bold text-slate-700 text-xs">
                              {driver.totalBonus}
                           </td>
                           {currentStep === 4 && (
                             <td className={cn(
                               "px-2 py-3 text-center bg-slate-50/50 font-mono font-bold text-xs",
                               driver.totalDifference > 0 ? "text-amber-700" : "text-emerald-700"
                             )}>
                                {driver.totalDifference} €
                             </td>
                           )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, trend, className }: { title: string, value: string, icon: React.ReactNode, trend?: string, className?: string }) {
  return (
    <Card className="border-none shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {icon}
        </div>
        <div className="flex items-end justify-between">
          <div className={cn("text-2xl font-bold text-slate-900", className)}>{value}</div>
          {trend && <div className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">{trend}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
