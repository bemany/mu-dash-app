import React from 'react';
import { cn } from '@/lib/utils';
import { DriverSummary, MonthlyStats } from '@/lib/types';
import { formatMonthHeader } from '@/lib/data-processor';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface DataTableProps {
  summaries: DriverSummary[];
  monthHeaders: string[];
  totals: { trips: number; bonus: number; paid: number; diff: number };
  showDiff?: boolean;
}

export function DataTable({ summaries, monthHeaders, totals, showDiff = false }: DataTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          {/* Header */}
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-6 py-4 font-bold text-slate-700 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] w-[180px]">
                Kennzeichen
              </th>
              {monthHeaders.map(month => (
                <th key={month} colSpan={showDiff ? 3 : 2} className="px-2 py-3 text-center border-l border-slate-200 min-w-[140px]">
                  <div className="font-semibold text-slate-700">{formatMonthHeader(month)}</div>
                </th>
              ))}
              <th colSpan={showDiff ? 3 : 2} className="px-4 py-3 text-center border-l border-slate-200 bg-slate-100/50 font-bold text-slate-800 min-w-[160px]">
                Gesamt
              </th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-2 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]"></th>
              {monthHeaders.map(month => (
                <React.Fragment key={month + '-sub'}>
                  <th className="px-2 py-2 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-400 border-l border-slate-200">Fahrten</th>
                  <th className="px-2 py-2 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-400">Bonus</th>
                  {showDiff && <th className="px-2 py-2 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-100/30">Diff</th>}
                </React.Fragment>
              ))}
              <th className="px-2 py-2 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-500 border-l border-slate-200 bg-slate-100/50">Fahrten</th>
              <th className="px-2 py-2 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-100/50">Bonus</th>
              {showDiff && <th className="px-2 py-2 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-100/50">Diff</th>}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100">
            {summaries.map((driver) => (
              <tr key={driver.licensePlate} className="hover:bg-slate-50/60 transition-colors group">
                <td className="px-6 py-3 font-semibold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50/60 z-10 whitespace-nowrap shadow-[1px_0_0_0_rgba(0,0,0,0.05)] border-r border-transparent">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-emerald-400 transition-colors" />
                    {driver.licensePlate}
                  </div>
                </td>
                
                {monthHeaders.map(month => {
                  const stat = driver.stats[month];
                  return (
                    <DataCell 
                      key={month + driver.licensePlate} 
                      stat={stat} 
                      showDiff={showDiff} 
                    />
                  );
                })}

                {/* Row Totals */}
                <td className="px-2 py-3 text-center border-l border-slate-200 bg-slate-50/30 font-mono font-medium text-slate-600 text-xs">
                  {driver.totalCount.toLocaleString()}
                </td>
                <td className="px-2 py-3 text-center bg-slate-50/30 font-mono font-bold text-slate-700 text-xs">
                  {driver.totalBonus > 0 ? driver.totalBonus + " €" : "-"}
                </td>
                {showDiff && (
                  <td className={cn(
                    "px-2 py-3 text-center bg-slate-50/30 font-mono font-bold text-xs border-r border-slate-50",
                    getDiffColor(driver.totalDifference)
                  )}>
                     {formatDiff(driver.totalDifference)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>

          {/* Footer */}
          <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] clip-path-inset-top">
             <tr>
                <td className="px-6 py-4 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">Gesamtsumme</td>
                {monthHeaders.map(month => {
                  const monthTotalCount = summaries.reduce((acc, curr) => acc + (curr.stats[month]?.count || 0), 0);
                  const monthTotalBonus = summaries.reduce((acc, curr) => acc + (curr.stats[month]?.bonus || 0), 0);
                  const monthTotalDiff = summaries.reduce((acc, curr) => acc + (curr.stats[month]?.difference || 0), 0);
                  
                  return (
                    <React.Fragment key={'total-'+month}>
                      <td className="px-2 py-4 text-center border-l border-slate-200 font-mono text-xs text-slate-600">
                        {monthTotalCount.toLocaleString()}
                      </td>
                      <td className="px-2 py-4 text-center font-mono text-xs text-emerald-700">
                        {monthTotalBonus.toLocaleString()} €
                      </td>
                      {showDiff && (
                        <td className={cn("px-2 py-4 text-center font-mono text-xs", getDiffColor(monthTotalDiff))}>
                          {formatDiff(monthTotalDiff)}
                        </td>
                      )}
                    </React.Fragment>
                  )
                })}
                <td className="px-2 py-4 text-center border-l border-slate-200 bg-slate-100/50 font-mono text-sm">
                  {totals.trips.toLocaleString()}
                </td>
                <td className="px-2 py-4 text-center bg-slate-100/50 font-mono text-sm text-emerald-700">
                  {totals.bonus.toLocaleString()} €
                </td>
                {showDiff && (
                  <td className={cn("px-2 py-4 text-center bg-slate-100/50 font-mono text-sm", getDiffColor(totals.diff))}>
                    {formatDiff(totals.diff)}
                  </td>
                )}
             </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function DataCell({ stat, showDiff }: { stat: MonthlyStats | undefined, showDiff: boolean }) {
  const count = stat?.count || 0;
  const bonus = stat?.bonus || 0;
  const diff = stat?.difference || 0;

  return (
    <React.Fragment>
      <td className={cn(
        "px-2 py-3 text-center border-l border-slate-100 font-mono text-xs transition-colors",
        count === 0 ? "text-slate-200" : "text-slate-600"
      )}>
        {count > 0 ? count : "-"}
      </td>
      <td className={cn(
        "px-2 py-3 text-center font-mono font-medium text-xs transition-colors",
        bonus > 0 ? "text-slate-800" : "text-slate-200"
      )}>
        {bonus > 0 ? bonus : "-"}
      </td>
      {showDiff && (
        <td className={cn("px-2 py-3 text-center font-mono text-xs border-r border-slate-50", getDiffColor(diff))}>
          {bonus > 0 || diff !== 0 ? formatDiff(diff) : "-"}
        </td>
      )}
    </React.Fragment>
  );
}

function getDiffColor(diff: number) {
  if (diff > 0) return "text-amber-600 font-bold bg-amber-50/50"; // Owed money
  if (diff < 0) return "text-blue-600 font-medium bg-blue-50/30"; // Overpaid
  if (diff === 0) return "text-emerald-600 bg-emerald-50/30"; // Perfect
  return "text-slate-300";
}

function formatDiff(diff: number) {
  if (diff === 0) return <span className="text-emerald-400">OK</span>;
  return `${diff > 0 ? '+' : ''}${diff} €`;
}
