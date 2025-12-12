import React, { useState, useMemo } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UberTrip, DriverSummary } from "@/lib/types";
import { processTrips, getMonthHeaders, formatMonthHeader } from "@/lib/data-processor";
import { generateMockTrips } from "@/lib/mock-data";
import { Download, RefreshCw, CarFront, BadgeEuro, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [trips, setTrips] = useState<UberTrip[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Process data when trips change
  const { summaries, monthHeaders, totals } = useMemo(() => {
    if (trips.length === 0) return { summaries: [], monthHeaders: [], totals: { trips: 0, bonus: 0 } };

    const processed = processTrips(trips);
    const months = getMonthHeaders(processed);
    
    const totalTrips = processed.reduce((acc, curr) => acc + curr.totalCount, 0);
    const totalBonus = processed.reduce((acc, curr) => acc + curr.totalBonus, 0);

    return { summaries: processed, monthHeaders: months, totals: { trips: totalTrips, bonus: totalBonus } };
  }, [trips]);

  const loadMockData = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setTrips(generateMockTrips(2000));
      setIsProcessing(false);
    }, 600);
  };

  const handleDataLoaded = (data: any[]) => {
    setIsProcessing(true);
    // Basic validation/mapping could go here
    setTrips(data as UberTrip[]);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Uber Umsatz Manager</h1>
            <p className="text-slate-500 mt-1">Werbeprämien & Bonus Abrechnung</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadMockData} disabled={isProcessing}>
              <RefreshCw className={cn("w-4 h-4 mr-2", isProcessing && "animate-spin")} />
              Beispieldaten laden
            </Button>
            {/* Export placeholder */}
            <Button disabled={trips.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportieren
            </Button>
          </div>
        </div>

        {/* Upload Section (conditionally rendered or always visible at top?) */}
        {trips.length === 0 && (
          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle>Daten Import</CardTitle>
              <CardDescription>Laden Sie die Fahrten-Exportdatei hoch um zu beginnen.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload onDataLoaded={handleDataLoaded} />
            </CardContent>
          </Card>
        )}

        {/* Dashboard Content */}
        {trips.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard 
                title="Gesamtfahrten" 
                value={totals.trips.toLocaleString('de-DE')} 
                icon={<CarFront className="w-5 h-5 text-blue-600" />}
                trend="+12% vs Vormonat" // Placeholder trend
              />
              <KpiCard 
                title="Bonus Auszahlung" 
                value={totals.bonus.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} 
                icon={<BadgeEuro className="w-5 h-5 text-emerald-600" />}
                className="text-emerald-700"
              />
              <KpiCard 
                title="Aktive Fahrzeuge" 
                value={summaries.length.toString()} 
                icon={<TrendingUp className="w-5 h-5 text-slate-600" />}
              />
            </div>

            {/* Main Table */}
            <Card className="border-none shadow-md overflow-hidden bg-white">
              <CardHeader className="pb-2">
                <CardTitle>Fahrzeug Übersicht</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 font-semibold sticky left-0 bg-slate-50 z-20">Kennzeichen</th>
                        {monthHeaders.map(month => (
                          <th key={month} colSpan={2} className="px-4 py-3 text-center border-l border-slate-200">
                            {formatMonthHeader(month)}
                          </th>
                        ))}
                        <th colSpan={2} className="px-4 py-3 text-center border-l border-slate-200 bg-slate-100 font-bold text-slate-700">
                          Gesamt
                        </th>
                      </tr>
                      <tr>
                        <th className="px-6 py-2 sticky left-0 bg-slate-50 z-20"></th>
                        {monthHeaders.map(month => (
                          <React.Fragment key={month + '-sub'}>
                            <th className="px-2 py-2 text-center text-[10px] text-slate-400 border-l border-slate-200">Fahrten</th>
                            <th className="px-2 py-2 text-center text-[10px] text-slate-400">Bonus</th>
                          </React.Fragment>
                        ))}
                        <th className="px-2 py-2 text-center text-[10px] text-slate-500 border-l border-slate-200 bg-slate-100">Fahrten</th>
                        <th className="px-2 py-2 text-center text-[10px] text-slate-500 bg-slate-100">Bonus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summaries.map((driver) => (
                        <tr key={driver.licensePlate} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-900 sticky left-0 bg-white hover:bg-slate-50/80 z-10 whitespace-nowrap border-r border-transparent">
                            {driver.licensePlate}
                          </td>
                          {monthHeaders.map(month => {
                            const stat = driver.stats[month];
                            const count = stat?.count || 0;
                            const bonus = stat?.bonus || 0;
                            
                            return (
                              <React.Fragment key={month + driver.licensePlate}>
                                <td className={cn(
                                  "px-2 py-3 text-center border-l border-slate-100 font-mono",
                                  count === 0 ? "text-slate-300" : "text-slate-600"
                                )}>
                                  {count > 0 ? count : "-"}
                                </td>
                                <td className={cn(
                                  "px-2 py-3 text-center font-mono font-medium",
                                  bonus > 0 ? "text-emerald-600 bg-emerald-50/50" : "text-slate-300"
                                )}>
                                  {bonus > 0 ? bonus + " €" : "-"}
                                </td>
                              </React.Fragment>
                            );
                          })}
                           {/* Row Totals */}
                           <td className="px-2 py-3 text-center border-l border-slate-200 bg-slate-50/50 font-mono font-semibold text-slate-700">
                              {driver.totalCount}
                           </td>
                           <td className="px-2 py-3 text-center bg-slate-50/50 font-mono font-bold text-emerald-700">
                              {driver.totalBonus} €
                           </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Footer Row for Columns Totals could go here */}
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
                       <tr>
                          <td className="px-6 py-4 sticky left-0 bg-slate-50 z-20">Gesamtsumme</td>
                          {monthHeaders.map(month => {
                            const monthTotalCount = summaries.reduce((acc, curr) => acc + (curr.stats[month]?.count || 0), 0);
                            const monthTotalBonus = summaries.reduce((acc, curr) => acc + (curr.stats[month]?.bonus || 0), 0);
                            return (
                              <React.Fragment key={'total-'+month}>
                                <td className="px-2 py-3 text-center border-l border-slate-200 font-mono text-xs">
                                  {monthTotalCount.toLocaleString()}
                                </td>
                                <td className="px-2 py-3 text-center font-mono text-xs text-emerald-700">
                                  {monthTotalBonus.toLocaleString()} €
                                </td>
                              </React.Fragment>
                            )
                          })}
                          <td className="px-2 py-3 text-center border-l border-slate-200 bg-slate-100 font-mono">
                            {totals.trips.toLocaleString()}
                          </td>
                          <td className="px-2 py-3 text-center bg-slate-100 font-mono text-emerald-700">
                            {totals.bonus.toLocaleString()} €
                          </td>
                       </tr>
                    </tfoot>
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
